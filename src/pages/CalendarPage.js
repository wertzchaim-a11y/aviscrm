import React, { useState } from 'react';
import { TaskViewer, TaskEditor, todayStr } from '../components/TaskModals';
import { ProjectSheet } from '../components/ProjectSheet';
import { curPeriod, nextStart } from './TodayPage';
import { isOutlookConnected, getValidAccessToken, syncOutlookToSupabase, getOutlookAuthUrl } from '../lib/outlookSync';

const pad = n => String(n).padStart(2, '0');

export default function CalendarPage({ data, onOpenRhythm }) {
  const now = new Date();
  const [calY, setCalY] = useState(now.getFullYear());
  const [calM, setCalM] = useState(now.getMonth());
  const [facSel, setFacSel] = useState([]);
  const [dayPop, setDayPop] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [newTaskPreset, setNewTaskPreset] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const { facilities, items, tasks, outlookDbEvents, recurringItems, recurringLogs, rhythmPeriods } = data;
  const today = todayStr();

  const prefix = `${calY}-${pad(calM + 1)}`;
  const first = new Date(calY, calM, 1).getDay();
  const dim = new Date(calY, calM + 1, 0).getDate();
  const facVisible = fid => facSel.length === 0 || !fid || facSel.includes(fid);

  const syncNow = async () => {
    if (syncing) return;
    if (!isOutlookConnected()) { window.location.href = getOutlookAuthUrl(); return; }
    setSyncing(true);
    const token = await getValidAccessToken();
    if (token) { await syncOutlookToSupabase(token); await data.refreshOutlookEvents(); setLastSync('just now'); }
    setSyncing(false);
  };

  const evBase = { fontSize: '10px', padding: '2px 7px', borderRadius: '5px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, cursor: 'pointer' };
  const styles = {
    task: { ...evBase, background: 'var(--blue-light)', color: 'var(--blue)' },
    meeting: { ...evBase, background: 'var(--rust-light)', color: 'var(--rust)' },
    proj: { ...evBase, background: 'var(--plum-light)', color: 'var(--plum)' },
    recur: { ...evBase, background: 'var(--green-light)', color: 'var(--green-dark)' },
    recurSched: { ...evBase, background: '#fff', color: 'var(--green)', border: '1px dashed #A9C6BC' },
    outlook: { ...evBase, background: '#EAEDF3', color: '#3E5570', cursor: 'default' },
  };

  const byDay = {};
  const push = (iso, ev, fid) => { if (!iso || !iso.startsWith(prefix) || !facVisible(fid)) return; const d = parseInt(iso.slice(8), 10); (byDay[d] = byDay[d] || []).push(ev); };

  tasks.forEach(t => {
    if (!t.due_date) return;
    const item = t.item_id ? items.find(i => i.id === t.item_id) : null;
    const isMtg = t.task_type === 'meeting';
    push(t.due_date, {
      text: (t.is_priority ? '* ' : '') + (isMtg ? 'mtg ' : '') + t.name + (isMtg && t.meeting_time ? ' - ' + t.meeting_time : ''),
      style: { ...(isMtg ? styles.meeting : styles.task), opacity: t.done ? 0.5 : 1, textDecoration: t.done ? 'line-through' : 'none' },
      open: () => setViewTask(t),
    }, item?.facility_id);
  });
  items.forEach(i => { if (i.due_date && !i.completed) push(i.due_date, { text: 'diamond ' + i.name, style: styles.proj, open: () => setViewItem(i) }, i.facility_id); });
  outlookDbEvents
    .filter(o => o.response_status === 'accepted' || o.response_status === 'organizer')
    .forEach(o => push(o.start_date, { text: '[] ' + o.subject + (o.start_time ? ' - ' + o.start_time : ''), style: styles.outlook }, null));
  rhythmPeriods.forEach(p => push(p.start_date, { text: '~> ' + (p.tracker === 'fundamental' ? 'Fundamental: ' : 'Theme: ') + p.title, style: styles.recur, open: () => onOpenRhythm(p.tracker) }, null));
  ['fundamental', 'marketing'].forEach(tr => {
    const cur = curPeriod(rhythmPeriods, tr);
    if (!cur) return;
    const ns = nextStart(cur.start_date, tr);
    if (!rhythmPeriods.some(p => p.tracker === tr && p.start_date === ns))
      push(ns, { text: '~> Set next ' + (tr === 'fundamental' ? 'fundamental' : 'theme'), style: styles.recurSched, open: () => onOpenRhythm(tr) }, null);
  });
  recurringLogs.forEach(lg => {
    const r = recurringItems.find(x => x.id === lg.recurring_item_id);
    const fac = facilities.find(f => f.id === lg.facility_id);
    if (r) push(lg.log_date, { text: '~> ' + r.name + (fac ? ' - ' + fac.name : ''), style: styles.recur, open: () => onOpenRhythm(r.id) }, lg.facility_id);
  });

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: '1120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="page-title">{new Date(calY, calM, 1).toLocaleDateString('en-US', calY === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' })}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-sm" style={{ width: 28, padding: '4px 0', justifyContent: 'center' }} onClick={() => { setCalM(m => m === 0 ? 11 : m - 1); if (calM === 0) setCalY(y => y - 1); }}>?</button>
            <button className="btn btn-sm" style={{ width: 28, padding: '4px 0', justifyContent: 'center' }} onClick={() => { setCalM(m => m === 11 ? 0 : m + 1); if (calM === 11) setCalY(y => y + 1); }}>?</button>
            <button className="btn-icon" style={{ fontSize: '9px', fontWeight: 600 }} onClick={syncNow}>
              {syncing ? '[] Syncing?' : lastSync ? '[] Synced ' + lastSync : isOutlookConnected() ? '[] Sync Outlook now' : '[] Connect Outlook'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <span className="section-label" style={{ marginRight: '2px' }}>Facilities</span>
          <button className={`chip ${facSel.length === 0 ? 'active' : ''}`} onClick={() => setFacSel([])}>All</button>
          {facilities.map(f => (
            <button key={f.id} className={`chip ${facSel.includes(f.id) ? 'active' : ''}`}
              onClick={() => setFacSel(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])}>{f.name}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', marginTop: '18px', marginBottom: '4px' }}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="section-label" style={{ padding: '0 8px' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
          {cells.map((d, i) => d === null
            ? <div key={i} style={{ minHeight: '104px', background: 'var(--border-2)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
            : (
              <div key={i} onClick={() => setDayPop(d)} style={{ minHeight: '104px', background: '#fff', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px', overflow: 'hidden', cursor: 'pointer' }}>
                {`${prefix}-${pad(d)}` === today
                  ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>{d}</div>
                  : <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '5px', height: '22px', display: 'flex', alignItems: 'center' }}>{d}</div>}
                {(byDay[d] || []).map((ev, j) => <div key={j} style={ev.style}>{ev.text}</div>)}
              </div>
            ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px 2px 0', fontSize: '10px', color: 'var(--text-3)' }}>
          <span>~> green = rhythm (logged / in effect) - dashed = coming up</span>
          <span>blue = task - rust = meeting - plum = project - [] slate = Outlook (confirmed only)</span>
        </div>
      </div>

      {dayPop != null && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setDayPop(null)}>
          <div className="sheet-center" style={{ padding: '22px', width: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="serif" style={{ fontSize: '18px', fontWeight: 600 }}>{new Date(calY, calM, dayPop).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <button className="btn-icon" style={{ fontSize: '18px' }} onClick={() => setDayPop(null)}>?</button>
            </div>
            {(byDay[dayPop] || []).map((ev, j) => (
              <div key={j} onClick={() => { if (ev.open) { setDayPop(null); ev.open(); } }}
                style={{ ...ev.style, fontSize: '12px', padding: '9px 12px', borderRadius: '9px', marginBottom: '7px', whiteSpace: 'normal', cursor: ev.open ? 'pointer' : 'default' }}>{ev.text}</div>
            ))}
            {!(byDay[dayPop] || []).length && <div style={{ padding: '18px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>Nothing on this day.</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
              onClick={() => { const due = `${prefix}-${pad(dayPop)}`; setDayPop(null); setNewTaskPreset({ due_date: due }); }}>+ Add a task on this day</button>
          </div>
        </div>
      )}
      {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
      {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
      {newTaskPreset && <TaskEditor preset={newTaskPreset} data={data} onClose={() => setNewTaskPreset(null)} />}
      {viewItem && <ProjectSheet item={viewItem} data={data} onClose={() => setViewItem(null)} onEdit={i => { setViewItem(null); setNewTaskPreset(null); }} />}
    </div>
  );
}

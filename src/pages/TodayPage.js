import React, { useState } from 'react';
import { TaskViewer, TaskEditor, fmtDate, todayStr } from '../components/TaskModals';
import { ProjectSheet } from '../components/ProjectSheet';

const PERIOD = { weekly: 7, monthly: 31, quarterly: 92 };
const daysSince = iso => Math.floor((new Date() - new Date(iso + 'T12:00:00')) / 864e5);
const fmtAgo = iso => { const d = daysSince(iso); if (d <= 0) return 'today'; if (d === 1) return 'yesterday'; if (d < 7) return d + ' days ago'; if (d < 31) return Math.floor(d / 7) + 'w ago'; return Math.floor(d / 30) + 'mo ago'; };
const GREEN = '#4C9A81', AMBER = '#D9A24A', RED = '#C4674F', GRAY = '#D5D0C8';
const Dot = ({ c }) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />;

export function facLogStatus(logs, facilityId, freq) {
  const lg = logs.find(l => l.facility_id === facilityId);
  if (!lg) return { key: 'never', lg: null };
  const d = daysSince(lg.log_date), p = PERIOD[freq] || 31;
  return { key: d <= p ? 'done' : d <= p * 2 ? 'due' : 'overdue', lg };
}
export const statusColor = { done: GREEN, due: AMBER, overdue: RED, never: GRAY };

export function curPeriod(rhythmPeriods, tracker) {
  const freq = tracker === 'fundamental' ? 'weekly' : 'monthly';
  return rhythmPeriods.find(p => p.tracker === tracker && daysSince(p.start_date) >= 0 && daysSince(p.start_date) < PERIOD[freq]);
}
export function nextStart(start, tracker) {
  const d = new Date(start + 'T12:00:00');
  if (tracker === 'fundamental') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TodayPage({ data, onNavigate, onOpenRhythm }) {
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [showAllAttn, setShowAllAttn] = useState(false);
  const { facilities, items, tasks, recurringItems, recurringLogs, rhythmPeriods } = data;
  const today = todayStr();

  const overdue = tasks.filter(t => !t.done && t.due_date && t.due_date < today && t.task_type !== 'meeting');
  const doctors = recurringItems.find(r => /doctor/i.test(r.name));
  const docLogs = doctors ? recurringLogs.filter(l => l.recurring_item_id === doctors.id) : [];
  const fundCur = curPeriod(rhythmPeriods, 'fundamental');
  const mktCur = curPeriod(rhythmPeriods, 'marketing');

  const docGaps = doctors ? facilities.map(f => ({ f, s: facLogStatus(docLogs, f.id, doctors.frequency) })).filter(x => x.s.key === 'overdue' || x.s.key === 'never') : [];
  const nextFundSet = fundCur ? rhythmPeriods.some(p => p.tracker === 'fundamental' && p.start_date === nextStart(fundCur.start_date, 'fundamental')) : true;

  const attention = [
    ...overdue.map(t => ({ key: 't' + t.id, text: t.name, sub: 'Task · was due ' + fmtDate(t.due_date), action: 'Open', dot: RED, go: () => setViewTask(t) })),
    ...docGaps.slice(0, 2).map(x => ({ key: 'd' + x.f.id, text: (x.s.key === 'never' ? 'No doctor visit logged yet at ' : 'No doctor visit lately at ') + x.f.name, sub: '↻ Doctor relationships · ' + (x.s.lg ? 'last ' + fmtAgo(x.s.lg.log_date) : 'never'), action: 'Log one', dot: x.s.key === 'never' ? GRAY : AMBER, go: () => onOpenRhythm(doctors.id) })),
    ...(!fundCur ? [{ key: 'f0', text: 'This week\u2019s fundamental isn\u2019t set', sub: '↻ Weekly fundamental', action: 'Set it', dot: RED, go: () => onOpenRhythm('fundamental') }] : []),
    ...(fundCur && !nextFundSet ? [{ key: 'f1', text: 'Next week\u2019s fundamental isn\u2019t set', sub: '↻ Weekly fundamental · week of ' + fmtDate(nextStart(fundCur.start_date, 'fundamental')), action: 'Set it', dot: AMBER, go: () => onOpenRhythm('fundamental') }] : []),
  ];
  const important = [
    ...tasks.filter(t => t.is_priority && !t.done).map(t => ({ key: 't' + t.id, text: t.name, sub: 'Task' + (t.due_date ? ' · due ' + fmtDate(t.due_date) : ''), go: () => setViewTask(t) })),
    ...items.filter(i => i.is_priority && !i.completed).map(i => { const fac = facilities.find(f => f.id === i.facility_id); return { key: 'i' + i.id, text: i.name, sub: 'Project · ' + (fac ? fac.name : '') + (i.due_date ? ' · due ' + fmtDate(i.due_date) : ''), go: () => setViewItem(i) }; });
  const meetings = tasks.filter(t => t.task_type === 'meeting' && t.due_date === today && !t.done)
    .sort((a, b) => (a.meeting_time || '') < (b.meeting_time || '') ? -1 : 1);

  const Row = ({ a }) => (
    <div key={a.key} onClick={a.go} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', cursor: 'pointer', borderTop: '1px solid var(--border-2)' }}>
      <Dot c={a.dot || AMBER} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{a.text}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{a.sub}</div>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>{a.action || 'Open'} →</span>
    </div>
  );

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: '960px' }}>
        <div className="page-title">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '5px' }}>{attention.length} thing{attention.length === 1 ? '' : 's'} could use your attention.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: '20px', marginTop: '28px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {important.length > 0 && (
              <div className="card" style={{ padding: '6px 0' }}>
                <div className="section-label" style={{ color: 'var(--amber)', padding: '12px 18px 6px' }}>★ Important</div>
                {important.map(a => <Row key={a.key} a={a} />)}
              </div>
            )}
            <div className="card" style={{ padding: '6px 0' }}>
              <div className="section-label" style={{ padding: '12px 18px 6px' }}>Needs attention</div>
              {attention.length === 0 && <div style={{ padding: '16px 18px', fontSize: '12px', color: 'var(--text-3)' }}>Nothing right now — all caught up.</div>}
              {(showAllAttn ? attention : attention.slice(0, 5)).map(a => <Row key={a.key} a={a} />)}
              {attention.length > 5 && (
                <div onClick={() => setShowAllAttn(p => !p)} style={{ padding: '10px 18px', borderTop: '1px solid var(--border-2)', fontSize: '11px', fontWeight: 600, color: 'var(--green)', cursor: 'pointer' }}>
                  {showAllAttn ? 'Show less' : `Show all (${attention.length})`}
                </div>
              )}
            </div>
            <div className="card" style={{ padding: '6px 0' }}>
              <div className="section-label" style={{ padding: '12px 18px 6px' }}>Today</div>
              {meetings.length === 0 && <div style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-3)' }}>No meetings today.</div>}
              {meetings.map(m => (
                <div key={m.id} onClick={() => setViewTask(m)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderTop: '1px solid var(--border-2)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', width: '48px', flexShrink: 0 }}>{m.meeting_time || ''}</span>
                  <Dot c="#A0623F" />
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{m.name}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{m.attendees || ''}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <div className="section-label">This week</div>
              <div onClick={() => onOpenRhythm('fundamental')} style={{ marginTop: '10px', cursor: 'pointer' }}>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>↻ Weekly fundamental</div>
                <div className="serif" style={{ fontSize: '17px', fontWeight: 500, lineHeight: 1.35, marginTop: '3px' }}>{fundCur ? '\u201C' + fundCur.title + '\u201D' : 'Not set yet'}</div>
              </div>
              <div onClick={() => onOpenRhythm('marketing')} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-2)', cursor: 'pointer' }}>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>↻ This month's theme</div>
                <div className="serif" style={{ fontSize: '17px', fontWeight: 500, lineHeight: 1.35, marginTop: '3px' }}>{mktCur ? '\u201C' + mktCur.title + '\u201D' : 'Not set yet'}</div>
              </div>
            </div>
            <div className="card" style={{ padding: '12px 0 6px' }}>
              <div className="section-label" style={{ padding: '0 18px 6px' }}>Facility pulse</div>
              {facilities.map(f => {
                const cells = recurringItems.map(r => facLogStatus(recurringLogs.filter(l => l.recurring_item_id === r.id), f.id, r.frequency));
                const gap = cells.some(c => c.key === 'overdue' || c.key === 'never');
                return (
                  <div key={f.id} onClick={() => onNavigate('rhythms')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 18px', borderTop: '1px solid var(--border-2)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>{f.name}</span>
                    {cells.map((c, i) => <Dot key={i} c={statusColor[c.key]} />)}
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', width: '64px', textAlign: 'right' }}>{gap ? 'needs a visit' : 'all fresh'}</span>
                  </div>
                );
              })}
              <div style={{ padding: '8px 18px 6px', fontSize: '9px', color: 'var(--text-3)' }}>one dot per rhythm — green fresh, amber due, red overdue</div>
            </div>
          </div>
        </div>
      </div>
      {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
      {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
      {viewItem && <ProjectSheet item={viewItem} data={data} onClose={() => setViewItem(null)} onEdit={() => {}} />}
    </div>
  );
}

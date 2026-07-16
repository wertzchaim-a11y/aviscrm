import React, { useState } from 'react';
import { TaskRow, TaskViewer, TaskEditor, fmtDate, todayStr } from '../components/TaskModals';
import { ProjectSheet } from '../components/ProjectSheet';
import { curPeriod, nextStart, facLogStatus, statusColor } from './TodayPage';

const daysSince = iso => Math.floor((new Date() - new Date(iso + 'T12:00:00')) / 864e5);
const fmtAgo = iso => { const d = daysSince(iso); if (d <= 0) return 'today'; if (d === 1) return 'yesterday'; if (d < 7) return d + ' days ago'; if (d < 31) return Math.floor(d / 7) + 'w ago'; return Math.floor(d / 30) + 'mo ago'; };
const Dot = ({ c }) => <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />;
const TRACKERS = [
  { id: 'fundamental', name: 'Weekly Fundamental', freq: 'weekly', word: 'week' },
  { id: 'marketing', name: 'Marketing Theme', freq: 'monthly', word: 'month' },
];
const fmtRange = (start, freq) => {
  const d = new Date(start + 'T12:00:00');
  if (freq === 'monthly') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const e = new Date(d); e.setDate(e.getDate() + 6);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '?' + e.toLocaleDateString('en-US', e.getMonth() === d.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
};
const StatusPill = ({ status }) => {
  const map = {
    done: ['On track', 'var(--green-light)', 'var(--green)'], due: ['Due', 'var(--amber-light)', 'var(--amber)'],
    overdue: ['Overdue', 'var(--red-light)', 'var(--red)'], never: ['Never', 'var(--border-2)', '#7A756C'],
    set: ['In effect', 'var(--green-light)', 'var(--green)'], unset: ['Needs setting', 'var(--red-light)', 'var(--red)'],
  };
  const [label, bg, fg] = map[status];
  return <span className="badge" style={{ background: bg, color: fg }}>{label}</span>;
};

// ?? THEME SHEET (fundamental / marketing) ??
function ThemeSheet({ tracker, data, onClose }) {
  const [setForm, setSetForm] = useState(null); // { start_date, title, description }
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [newTask, setNewTask] = useState(false);
  const { rhythmPeriods, notes, tasks } = data;
  const tr = TRACKERS.find(t => t.id === tracker);
  const periods = rhythmPeriods.filter(p => p.tracker === tracker);
  const cur = curPeriod(rhythmPeriods, tracker);
  const curNotes = cur ? notes.filter(n => n.rhythm_period_id === cur.id) : [];
  const curTasks = cur ? tasks.filter(t => t.rhythm_id === tracker && t.rhythm_start === cur.start_date) : [];
  const upcoming = cur ? periods.filter(p => p.start_date > cur.start_date).sort((a, b) => a.start_date < b.start_date ? -1 : 1) : [];
  const past = periods.filter(p => !cur || p.start_date < cur.start_date);

  // period options: current + next 12
  const opts = [];
  let s = cur ? cur.start_date : todayStr();
  for (let i = 0; i < 13; i++) { opts.push(s); s = nextStart(s, tracker); }
  const firstUnset = opts.find(o => !periods.some(p => p.start_date === o));

  const savePeriod = async () => {
    if (!setForm || !setForm.title.trim()) return;
    await data.setRhythmPeriod({ tracker, start_date: setForm.start_date, title: setForm.title.trim(), description: setForm.description });
    setSetForm(null);
  };
  const saveNote = async () => {
    const v = noteDraft.trim(); if (!v || !cur) return;
    if (editingNoteId != null) await data.updateNote(editingNoteId, v);
    else await data.addNote({ rhythm_period_id: cur.id, text: v });
    setNoteDraft(''); setEditingNoteId(null); setNoteOpen(false);
  };
  const showNoteForm = noteOpen || editingNoteId != null;

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>~> {tr.name}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
              <StatusPill status={cur ? 'set' : 'unset'} />
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>every {tr.word} has one</span>
            </div>
          </div>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>

        <div style={{ marginTop: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div className="section-label" style={{ flex: 1 }}>{tr.freq === 'weekly' ? 'This week' : 'This month'}{cur ? ' - ' + fmtRange(cur.start_date, tr.freq) : ''}</div>
            {cur && <button className="link-btn" onClick={() => setSetForm({ start_date: cur.start_date, title: cur.title, description: cur.description || '' })}>edit</button>}
          </div>
          <div className="serif" style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, margin: '5px 0 8px' }}>{cur ? cur.title : 'Not set yet'}</div>
          {cur?.description && <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{cur.description}</div>}
          {curTasks.map(t => <TaskRow key={t.id} t={t} data={data} onOpen={setViewTask} showSub={false} />)}
          {cur && <button className="btn btn-sm" style={{ color: 'var(--green)', marginTop: '10px' }} onClick={() => setNewTask(true)}>+ Add task</button>}
          {cur && <div style={{ marginTop: '12px' }}>
            <div className="section-label" style={{ marginBottom: '4px' }}>Notes</div>
            {curNotes.map(n => (
              <div key={n.id} className="note-card">
                <div className="text">{n.text}</div>
                <button className="link-btn" onClick={() => { setEditingNoteId(n.id); setNoteDraft(n.text); }}>edit</button>
                <button className="link-btn danger" onClick={() => data.deleteNote(n.id)}>?</button>
              </div>
            ))}
            {!showNoteForm && <button className="btn btn-sm" style={{ color: 'var(--green)' }} onClick={() => { setNoteOpen(true); setNoteDraft(''); }}>+ Add note</button>}
            {showNoteForm && <>
              <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add a note?" autoFocus />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button className="btn btn-sm btn-primary" onClick={saveNote}>{editingNoteId != null ? 'Save note' : '+ Add note'}</button>
                <button className="btn btn-sm" onClick={() => { setNoteOpen(false); setEditingNoteId(null); setNoteDraft(''); }}>Cancel</button>
              </div>
            </>}
          </div>}
        </div>

        {upcoming.length > 0 && <div style={{ marginTop: '14px' }}>
          <div className="section-label" style={{ marginBottom: '6px' }}>Upcoming - already set</div>
          {upcoming.map(p => (
            <div key={p.id} style={{ padding: '8px 11px', border: '1px dashed #A9C6BC', borderRadius: '9px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>"{p.title}"</span>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtRange(p.start_date, tr.freq)}</span>
                <button className="link-btn" onClick={() => setSetForm({ start_date: p.start_date, title: p.title, description: p.description || '' })}>edit</button>
                <button className="link-btn danger" onClick={() => data.deleteRhythmPeriod(p.id)}>?</button>
              </div>
            </div>
          ))}
        </div>}

        <div style={{ marginTop: '10px', background: 'var(--amber-light)', border: '1px dashed #E4C795', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', marginBottom: '8px' }}>Set or edit a {tr.word} - pick which one, add as many ahead as you like</div>
          {!setForm ? (
            <button className="btn btn-sm" style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#fff' }}
              onClick={() => setSetForm({ start_date: firstUnset || opts[0], title: '', description: '' })}>Set or edit ?</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <select value={setForm.start_date} onChange={e => { const sd = e.target.value; const ex = periods.find(p => p.start_date === sd); setSetForm({ start_date: sd, title: ex ? ex.title : '', description: ex ? (ex.description || '') : '' }); }}>
                {[...periods.map(p => p.start_date).filter(x => !opts.includes(x)).sort(), ...opts].map(o => {
                  const ex = periods.find(p => p.start_date === o);
                  return <option key={o} value={o}>{fmtRange(o, tr.freq)}{ex ? ' - "' + ex.title + '"' : ' - not set'}</option>;
                })}
              </select>
              <input value={setForm.title} onChange={e => setSetForm(p => ({ ...p, title: e.target.value }))} placeholder={tr.id === 'fundamental' ? 'e.g. Smile in every hallway' : 'e.g. Back to School'} />
              <textarea value={setForm.description} onChange={e => setSetForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)?" style={{ minHeight: '48px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm" style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#fff' }} onClick={savePeriod}>Save</button>
                <button className="btn btn-sm" onClick={() => setSetForm(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '18px' }}>
          <div className="section-label" style={{ marginBottom: '8px' }}>Past {tr.word}s</div>
          {past.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '8px 0', borderTop: '1px solid var(--border-2)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>"{p.title}"</span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtRange(p.start_date, tr.freq)}</span>
              <button className="link-btn" onClick={() => setSetForm({ start_date: p.start_date, title: p.title, description: p.description || '' })}>edit</button>
            </div>
          ))}
          {past.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>No history yet.</div>}
        </div>
        {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
        {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
        {newTask && cur && <TaskEditor preset={{ rhythm_id: tracker, rhythm_start: cur.start_date }} data={data} onClose={() => setNewTask(false)} />}
      </div>
    </div>
  );
}

// ?? LOG SHEET (facility events / doctor visits) ??
function LogSheet({ recurring, data, onClose }) {
  const [logForm, setLogForm] = useState(null); // { id?, log_date, facility_id, notes }
  const [viewItem, setViewItem] = useState(null);
  const { facilities, items, recurringLogs } = data;
  const logs = recurringLogs.filter(l => l.recurring_item_id === recurring.id);
  const upcoming = items.filter(i => !i.completed && i.stream === recurring.id && i.due_date && i.due_date >= todayStr());

  const submit = async () => {
    if (!logForm) return;
    const rec = { log_date: logForm.log_date || todayStr(), facility_id: logForm.facility_id || null, notes: logForm.notes || null };
    if (logForm.id) await data.updateRecurringLog(logForm.id, rec);
    else await data.addRecurringLog({ recurring_item_id: recurring.id, ...rec });
    setLogForm(null);
  };

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>~> {recurring.name}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{logs.length ? 'last ' + fmtAgo(logs[0].log_date) : 'never logged'}</span>
            </div>
          </div>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>

        {upcoming.length > 0 && <div style={{ marginTop: '14px' }}>
          <div className="section-label" style={{ marginBottom: '7px' }}>Upcoming</div>
          {upcoming.map(i => {
            const fac = facilities.find(f => f.id === i.facility_id);
            return (
              <div key={i.id} onClick={() => setViewItem(i)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', border: '1px dashed #A9C6BC', borderRadius: '10px', marginBottom: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>diamond</span>
                <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>{i.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac ? fac.name + ' - ' : ''}{fmtDate(i.due_date)}</span>
              </div>
            );
          })}
        </div>}

        <div style={{ marginTop: '16px' }}>
          <div className="section-label" style={{ marginBottom: '7px' }}>Last time, per facility</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {facilities.map(f => {
              const s = facLogStatus(logs, f.id, recurring.frequency);
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)' }}>
                  <Dot c={statusColor[s.key]} />
                  <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.lg ? fmtAgo(s.lg.log_date) : 'never'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!logForm ? (
          <button className="btn btn-primary" style={{ marginTop: '14px' }} onClick={() => setLogForm({ log_date: todayStr(), facility_id: '', notes: '' })}>done Log one now</button>
        ) : (
          <div style={{ marginTop: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green)', marginBottom: '8px' }}>{logForm.id ? 'Edit this log entry' : 'Record one that happened - goes into the history below'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', gap: '7px' }}>
                <input type="date" value={logForm.log_date} onChange={e => setLogForm(p => ({ ...p, log_date: e.target.value }))} />
                <select value={logForm.facility_id} onChange={e => setLogForm(p => ({ ...p, facility_id: e.target.value }))}>
                  <option value="">Facility (optional)?</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <textarea value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} placeholder="What happened? Multi-line notes are fine?" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-primary" onClick={submit}>{logForm.id ? 'Save changes' : 'done Log it'}</button>
                <button className="btn btn-sm" onClick={() => setLogForm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '18px' }}>
          <div className="section-label" style={{ marginBottom: '8px' }}>History</div>
          {logs.map(lg => {
            const fac = facilities.find(f => f.id === lg.facility_id);
            const proj = lg.item_id ? items.find(i => i.id === lg.item_id) : null;
            return (
              <div key={lg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', marginBottom: '7px', background: 'var(--surface)', border: '1px solid var(--border-2)' }}>
                <span style={{ marginTop: '4px' }}><Dot c="#4C9A81" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{lg.notes || 'Logged'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{fac ? fac.name + ' - ' : ''}{fmtDate(lg.log_date)} - {fmtAgo(lg.log_date)}</div>
                  {proj && <div onClick={() => setViewItem(proj)} style={{ fontSize: '10px', color: 'var(--plum)', cursor: 'pointer', marginTop: '2px' }}>diamond {proj.name}</div>}
                </div>
                <button className="link-btn" onClick={() => setLogForm({ id: lg.id, log_date: lg.log_date, facility_id: lg.facility_id || '', notes: lg.notes || '' })}>edit</button>
                <button className="link-btn danger" onClick={() => data.deleteRecurringLog(lg.id)}>?</button>
              </div>
            );
          })}
          {logs.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Nothing logged yet.</div>}
        </div>
        {viewItem && <ProjectSheet item={viewItem} data={data} onClose={() => setViewItem(null)} onEdit={() => {}} />}
      </div>
    </div>
  );
}

// ?? PAGE ??
export default function RhythmsPage({ data, openRhythm, onOpenRhythm, onCloseRhythm }) {
  const { facilities, tasks, recurringItems, recurringLogs, rhythmPeriods } = data;

  const openTheme = openRhythm === 'fundamental' || openRhythm === 'marketing' ? openRhythm : null;
  const openLog = !openTheme && openRhythm ? recurringItems.find(r => r.id === openRhythm) : null;

  const overallLogStatus = r => {
    const logs = recurringLogs.filter(l => l.recurring_item_id === r.id);
    if (!logs.length) return 'never';
    const d = daysSince(logs[0].log_date), p = { weekly: 7, monthly: 31, quarterly: 92 }[r.frequency] || 31;
    return d <= p ? 'done' : d <= p * 2 ? 'due' : 'overdue';
  };

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: '960px' }}>
        <div className="page-title">Rhythms</div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '5px' }}>The things you do every week, every month, or whenever the moment comes - tracked without scheduling them.</div>

        <div className="section-label" style={{ marginTop: '30px' }}>Every period has one</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '10px' }}>
          {TRACKERS.map(tr => {
            const cur = curPeriod(rhythmPeriods, tr.id);
            const curTasks = cur ? tasks.filter(t => t.rhythm_id === tr.id && t.rhythm_start === cur.start_date) : [];
            const hasNext = cur ? rhythmPeriods.some(p => p.tracker === tr.id && p.start_date === nextStart(cur.start_date, tr.id)) : false;
            return (
              <div key={tr.id} className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onOpenRhythm(tr.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>~> {tr.name}</span>
                  <StatusPill status={cur ? 'set' : 'unset'} />
                </div>
                <div className="serif" style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.3, marginTop: '8px' }}>{cur ? '"' + cur.title + '"' : 'Not set'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px' }}>
                  {curTasks.length ? curTasks.filter(t => t.done).length + ' of ' + curTasks.length + ' tasks done - ' : ''}{cur ? (hasNext ? 'next one is set' : 'next one not set yet') : 'tap to set it'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-label" style={{ marginTop: '30px' }}>Whenever they happen - just log it</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '10px' }}>
          {recurringItems.map(r => {
            const logs = recurringLogs.filter(l => l.recurring_item_id === r.id);
            return (
              <div key={r.id} className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onOpenRhythm(r.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>~> {r.name}</span>
                  <StatusPill status={overallLogStatus(r)} />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {facilities.map(f => {
                    const s = facLogStatus(logs, f.id, r.frequency);
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Dot c={statusColor[s.key]} />
                        <span style={{ fontSize: '12px', flex: 1 }}>{f.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.lg ? fmtAgo(s.lg.log_date) : 'never'}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); onOpenRhythm(r.id); }}>done Log one now</button>
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); onOpenRhythm(r.id); }}>History</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {openTheme && <ThemeSheet tracker={openTheme} data={data} onClose={onCloseRhythm} />}
      {openLog && <LogSheet recurring={openLog} data={data} onClose={onCloseRhythm} />}
    </div>
  );
}

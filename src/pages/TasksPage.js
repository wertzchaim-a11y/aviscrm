import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';
import PeopleInput from '../components/PeopleInput';

const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
const PRI_ORDER = { High: 0, Medium: 1, Low: 2 };
function fmt(d) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

export default function TasksPage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, addStep, toggleStep, deleteStep, addTask, updateItem, deleteItem, updateTask, toggleTask, deleteTask, reorderTasks, addNote, deleteNote, calcProgress } = data;
  const [facFilter, setFacFilter] = useState('');
  const [respFilter, setRespFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [priFilter, setPriFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState(() => localStorage.getItem('tasks-sort') || 'due');
  const [openItem, setOpenItem] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', meeting_time: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '', task_type: 'task', attendees: '' });

  const handleSortChange = (mode) => { setSortMode(mode); localStorage.setItem('tasks-sort', mode); };

  const allPeople = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];

  const filtered = tasks.filter(t => {
    const item = items.find(i => i.id === t.item_id);
    if (facFilter && (!item || item.facility_id !== facFilter)) return false;
    if (respFilter && (!item || item.responsibility !== respFilter)) return false;
    if (personFilter && t.assigned_to !== personFilter) return false;
    if (priFilter && t.priority !== priFilter) return false;
    if (typeFilter && (t.task_type || 'task') !== typeFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(item?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (sortMode === 'priority') {
      const pd = (PRI_ORDER[a.priority] ?? 1) - (PRI_ORDER[b.priority] ?? 1);
      if (pd !== 0) return pd;
    }
    if (sortMode === 'due') {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
    }
    if (sortMode === 'manual') return (a.position ?? 0) - (b.position ?? 0);
    return 0;
  });

  const handleMove = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= filtered.length) return;
    await reorderTasks(fromIdx, toIdx, filtered);
  };

  const handleAddTask = async () => {
    if (!taskForm.name.trim()) return;
    await addTask({
      name: taskForm.name.trim(),
      due_date: taskForm.due_date || null,
      meeting_time: taskForm.meeting_time || null,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority || 'Medium',
      notes: taskForm.notes || null,
      item_id: taskForm.item_id || null,
      step_id: null,
      done: false,
      task_type: taskForm.task_type || 'task',
      attendees: taskForm.attendees || null,
    });
    setTaskForm({ name: '', due_date: '', meeting_time: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '', task_type: 'task', attendees: '' });
    setShowAddTask(false);
  };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);
  const selectStyle = { fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', minWidth: 0, flexShrink: 0, maxWidth: '110px' };
  const isMeeting = taskForm.task_type === 'meeting';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Tasks</h1>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select value={sortMode} onChange={e => handleSortChange(e.target.value)} style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 'var(--radius)' }}>
              <option value="due">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
              <option value="manual">Sort: Manual</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>+ Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px', alignItems: 'center' }}>
          <select value={facFilter} onChange={e => setFacFilter(e.target.value)} style={selectStyle}>
            <option value="">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={respFilter} onChange={e => setRespFilter(e.target.value)} style={selectStyle}>
            <option value="">All resp.</option>
            <option>Marketing</option><option>Employee retention</option><option>Recruitment</option><option>Other</option>
          </select>
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)} style={selectStyle}>
            <option value="">All people</option>
            {allPeople.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={priFilter} onChange={e => setPriFilter(e.target.value)} style={selectStyle}>
            <option value="">All pri.</option>
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All types</option>
            <option value="task">Tasks</option>
            <option value="meeting">Meetings</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ fontSize: '11px', padding: '4px 7px', height: '26px', minWidth: '70px', maxWidth: '90px', flexShrink: 1 }} />
        </div>
      </div>

      <div style={{ padding: '10px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: '13px' }}>No tasks match your filters.</div>
        ) : filtered.map((t, idx) => {
          const item = items.find(i => i.id === t.item_id);
          const fac = facilities.find(f => f.id === item?.facility_id);
          const ov = isOverdue(t.due_date) && !t.done;
          const isMtg = t.task_type === 'meeting';
          return (
            <div key={t.id} className="card" style={{ padding: '10px 12px', marginBottom: '7px', display: 'flex', alignItems: 'stretch', gap: '0' }}>
              {sortMode === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '8px', justifyContent: 'center' }}>
                  <button onClick={() => handleMove(idx, idx - 1)} disabled={idx === 0} style={{ fontSize: '10px', padding: '2px 5px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => handleMove(idx, idx + 1)} disabled={idx === filtered.length - 1} style={{ fontSize: '10px', padding: '2px 5px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', cursor: idx === filtered.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === filtered.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
              )}
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => item && setOpenItem(t.item_id)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
                  <div className={`cb ${t.done ? 'checked' : ''}`} style={{ marginTop: '1px' }} onClick={e => { e.stopPropagation(); data.toggleTask(t.id); }}>
                    {t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontWeight: '600', fontSize: '13px', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)', lineHeight: '1.4' }}>{t.name}</span>
                  {isMtg && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: '#FFF0E6', color: '#A84000', fontWeight: '500', flexShrink: 0 }}>📅 Meeting</span>}
                  {!isMtg && <span className={`badge ${PRI_BADGE[t.priority]}`}>{t.priority}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '25px' }}>
                  {fac && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac.name}</span>}
                  {item && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {item.name}</span>}
                  {!item && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Standalone</span>}
                  {t.assigned_to && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {t.assigned_to}</span>}
                  {t.due_date && <span style={{ fontSize: '11px', color: ov ? 'var(--red)' : 'var(--text-3)', fontWeight: ov ? '600' : '400' }}>· {ov ? 'Overdue ' : ''}{fmt(t.due_date)}{t.meeting_time ? ' @ ' + t.meeting_time : ''}</span>}
                  {isMtg && t.attendees && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {t.attendees}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddTask && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setShowAddTask(false)}>
          <div className="sheet-center" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add task or meeting</h2>
              <button className="btn-icon" onClick={() => setShowAddTask(false)} style={{ fontSize: '18px' }}>×</button>
            </div>
            {/* Type toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[['task', '☑ Task'], ['meeting', '📅 Meeting']].map(([t, l]) => (
                <button key={t} onClick={() => setTaskForm(p => ({ ...p, task_type: t }))}
                  style={{ flex: 1, padding: '7px', fontSize: '13px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: taskForm.task_type === t ? 'var(--text)' : 'var(--surface)', color: taskForm.task_type === t ? '#fff' : 'var(--text-2)' }}>
                  {l}
                </button>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group full"><label>{isMeeting ? 'Meeting name' : 'Task name'} *</label>
                <input value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} autoFocus placeholder={isMeeting ? 'What is the meeting about?' : 'What needs to be done?'} />
              </div>
              <div className="form-group"><label>Date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              {isMeeting && <div className="form-group"><label>Time</label><input type="time" value={taskForm.meeting_time} onChange={e => setTaskForm(p => ({ ...p, meeting_time: e.target.value }))} /></div>}
              {!isMeeting && <div className="form-group"><label>Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>}
              <div className="form-group"><label>Assigned to</label>
                <PeopleInput value={taskForm.assigned_to} onChange={v => setTaskForm(p => ({ ...p, assigned_to: v }))} placeholder="Name…" />
              </div>
              {isMeeting && (
                <div className="form-group full"><label>Attendees (optional)</label>
                  <input value={taskForm.attendees} onChange={e => setTaskForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Names separated by commas…" />
                </div>
              )}
              <div className="form-group full"><label>Link to project (optional)</label>
                <select value={taskForm.item_id} onChange={e => setTaskForm(p => ({ ...p, item_id: e.target.value }))}>
                  <option value="">— Standalone —</option>
                  {items.map(i => { const fac = facilities.find(f => f.id === i.facility_id); return <option key={i.id} value={i.id}>{fac ? fac.name + ' · ' : ''}{i.name}</option>; })}
                </select>
              </div>
              <div className="form-group full"><label>Notes</label><textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any extra details…" /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setShowAddTask(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleAddTask}>Save {isMeeting ? 'meeting' : 'task'}</button>
            </div>
          </div>
        </div>
      )}

      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas}
          onClose={() => setOpenItem(null)}
          onUpdateItem={updateItem} onDeleteItem={deleteItem} onAddStep={addStep} onToggleStep={toggleStep} onDeleteStep={deleteStep}
          onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
          onAddNote={addNote} onDeleteNote={deleteNote}
          onGoIdeas={() => setOpenItem(null)}
          calcProgress={calcProgress}
        />
      )}
    </div>
  );
}

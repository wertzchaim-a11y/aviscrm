import React, { useState } from 'react';

const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
function isOverdue(d) { if (!d) return false; return d < new Date().toISOString().slice(0, 10); }

const TAB_STYLE = (active) => ({
  padding: '10px 14px',
  fontSize: '12px',
  fontWeight: active ? '600' : '500',
  color: active ? '#1D9E75' : '#aaa',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  background: 'transparent',
  border: 'none',
  borderBottom: active ? '2px solid #1D9E75' : '2px solid transparent',
  fontFamily: 'var(--font)',
});

const COUNT_BADGE = (active, n) => n > 0 ? (
  <span style={{ fontSize: '10px', background: active ? '#E8F8F0' : '#F0F0F0', color: active ? '#1D9E75' : '#888', borderRadius: '10px', padding: '1px 5px', marginLeft: '4px' }}>{n}</span>
) : null;

export default function ItemSheet({ item, facility, steps, tasks, notes, ideas, onClose, onUpdateItem, onDeleteItem, onAddStep, onToggleStep, onDeleteStep, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onAddNote, onDeleteNote, onGoIdeas, calcProgress }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [activeTask, setActiveTask] = useState(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [itemEditForm, setItemEditForm] = useState({});
  const [showStepForm, setShowStepForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newNote, setNewNote] = useState('');
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', meeting_time: '', assigned_to: '', priority: 'Medium', step_id: '', notes: '', task_type: 'task', attendees: '' });
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
  const progress = calcProgress(item);
  const itemSteps = steps.filter(s => s.item_id === item.id);
  const PRI_ORD = { High: 0, Medium: 1, Low: 2 };
  const itemTasks = tasks.filter(t => t.item_id === item.id).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return (PRI_ORD[a.priority] ?? 1) - (PRI_ORD[b.priority] ?? 1);
  });
  const itemNotes = notes.filter(n => n.item_id === item.id);
  const respIdeas = ideas.filter(i => i.responsibility === item.responsibility);
  const today = new Date().toISOString().slice(0, 10);

  const startEditItem = () => {
    setItemEditForm({ name: item.name, type: item.type, facility_id: item.facility_id, responsibility: item.responsibility, due_date: item.due_date || '', assigned_to: item.assigned_to || '' });
    setEditingItem(true);
  };
  const saveEditItem = async () => {
    if (!itemEditForm.name.trim()) return;
    await onUpdateItem(item.id, { name: itemEditForm.name.trim(), type: itemEditForm.type, facility_id: itemEditForm.facility_id, responsibility: itemEditForm.responsibility, due_date: itemEditForm.due_date || null, assigned_to: itemEditForm.assigned_to || null });
    setEditingItem(false);
  };
  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    await onAddStep({ item_id: item.id, name: newStep.trim() });
    setNewStep(''); setShowStepForm(false);
  };
  const handleAddTask = async () => {
    if (!taskForm.name.trim()) return;
    await onAddTask({ ...taskForm, item_id: item.id, step_id: taskForm.step_id || null, task_type: taskForm.task_type || 'task', meeting_time: taskForm.meeting_time || null, attendees: taskForm.attendees || null });
    setTaskForm({ name: '', due_date: '', meeting_time: '', assigned_to: '', priority: 'Medium', step_id: '', notes: '', task_type: 'task', attendees: '' });
    setShowTaskForm(false);
  };
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await onAddNote({ item_id: item.id, text: newNote.trim() });
    setNewNote('');
  };
  const handleSaveEdit = async () => {
    await onUpdateTask(activeTask.id, editForm);
    setActiveTask({ ...activeTask, ...editForm });
    setEditingTask(false);
  };
  const handleDeleteItem = async () => { await onDeleteItem(item.id); onClose(); };

  const ov = isOverdue(item.due_date) && !item.completed;

  // ── TASK DETAIL VIEW ──
  if (activeTask) {
    const step = itemSteps.find(s => s.id === activeTask.step_id);
    const isMtg = activeTask.task_type === 'meeting';
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setActiveTask(null)}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ padding: '16px 18px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', textDecoration: activeTask.done ? 'line-through' : 'none', color: activeTask.done ? 'var(--text-3)' : 'var(--text)' }}>{activeTask.name}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {isMtg ? <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#FDEAEA', color: '#A93226', fontWeight: '600' }}>📅 Meeting</span> : <span className={`badge ${PRI_BADGE[activeTask.priority]}`}>{activeTask.priority}</span>}
                  {activeTask.assigned_to && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>👤 {activeTask.assigned_to}</span>}
                  {activeTask.due_date && <span className="badge" style={{ background: isOverdue(activeTask.due_date) && !activeTask.done ? 'var(--red-light)' : 'var(--gray-light)', color: isOverdue(activeTask.due_date) && !activeTask.done ? 'var(--red)' : 'var(--gray)' }}>{fmt(activeTask.due_date)}{activeTask.meeting_time ? ' @ ' + activeTask.meeting_time : ''}</span>}
                  {activeTask.attendees && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>👥 {activeTask.attendees}</span>}
                  {step && <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>↳ {step.name}</span>}
                  <span className="badge" style={{ background: activeTask.done ? 'var(--green-light)' : 'var(--gray-light)', color: activeTask.done ? 'var(--green-text)' : 'var(--gray)' }}>{activeTask.done ? '✓ Done' : 'Open'}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setActiveTask(null)} style={{ fontSize: '18px', flexShrink: 0 }}>×</button>
            </div>
          </div>
          {activeTask.notes && !editingTask && (
            <div style={{ margin: '12px 18px', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', borderLeft: '3px solid var(--green)' }}>{activeTask.notes}</div>
          )}
          {editingTask ? (
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {[['task', '☑ Task'], ['meeting', '📅 Meeting']].map(([t, l]) => (
                  <button key={t} onClick={() => setEditForm(p => ({ ...p, task_type: t }))}
                    style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: editForm.task_type === t ? 'var(--text)' : 'var(--surface)', color: editForm.task_type === t ? '#fff' : 'var(--text-2)' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="form-row" style={{ marginBottom: '10px' }}>
                <div className="form-group full"><label>Name</label><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label>Date</label><input type="date" value={editForm.due_date || ''} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                {editForm.task_type === 'meeting' && <div className="form-group"><label>Time</label><input type="time" value={editForm.meeting_time || ''} onChange={e => setEditForm(p => ({ ...p, meeting_time: e.target.value }))} /></div>}
                <div className="form-group"><label>Assigned to</label><input value={editForm.assigned_to || ''} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                {editForm.task_type !== 'meeting' && <div className="form-group"><label>Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>}
                {editForm.task_type === 'meeting' && <div className="form-group full"><label>Attendees</label><input value={editForm.attendees || ''} onChange={e => setEditForm(p => ({ ...p, attendees: e.target.value }))} /></div>}
                <div className="form-group full"><label>Notes</label><textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="form-actions">
                <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => { onDeleteTask(activeTask.id); setActiveTask(null); }}>Delete</button>
                <button className="btn btn-sm" onClick={() => setEditingTask(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 18px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onToggleTask(activeTask.id)}>
                {activeTask.done ? '↩ Reopen' : '✓ Mark done'}
              </button>
              <button className="btn btn-sm" onClick={() => { setEditForm({ name: activeTask.name, due_date: activeTask.due_date || '', meeting_time: activeTask.meeting_time || '', assigned_to: activeTask.assigned_to || '', priority: activeTask.priority || 'Medium', notes: activeTask.notes || '', task_type: activeTask.task_type || 'task', attendees: activeTask.attendees || '' }); setEditingTask(true); }}>Edit</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN PROJECT SHEET ──
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        {/* Header */}
        {editingItem ? (
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className="form-row">
              <div className="form-group full"><label>Name</label><input value={itemEditForm.name} onChange={e => setItemEditForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="form-group"><label>Type</label>
                <select value={itemEditForm.type} onChange={e => setItemEditForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="project">Project</option><option value="event">Event</option><option value="meeting">Meeting</option>
                </select>
              </div>
              <div className="form-group"><label>Responsibility</label>
                <select value={itemEditForm.responsibility} onChange={e => setItemEditForm(p => ({ ...p, responsibility: e.target.value }))}>
                  {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Due date</label><input type="date" value={itemEditForm.due_date} onChange={e => setItemEditForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div className="form-group"><label>Assigned to</label><input value={itemEditForm.assigned_to} onChange={e => setItemEditForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setEditingItem(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={saveEditItem}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '17px', fontWeight: '700', lineHeight: '1.3', marginBottom: '6px' }}>{item.name}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {facility && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#EBF3FD', color: '#0C447C', fontWeight: '600' }}>{facility.name}</span>}
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#F0EEFF', color: '#5B21B6', fontWeight: '600' }}>{item.responsibility}</span>
                  {item.due_date && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: ov ? 'var(--red-light)' : '#F5F5F5', color: ov ? 'var(--red)' : '#666', fontWeight: '600' }}>{ov ? '⚠ Overdue · ' : '📅 Due '}{fmt(item.due_date)}</span>}
                  {item.assigned_to && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#F5F5F5', color: '#666', fontWeight: '500' }}>👤 {item.assigned_to}</span>}
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: item.completed ? 'var(--green-light)' : '#F5F5F5', color: item.completed ? 'var(--green-text)' : '#888', fontWeight: '600' }}>{item.type}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={onClose} style={{ fontSize: '20px', flexShrink: 0, marginTop: '-2px' }}>×</button>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: '500' }}>Progress</span>
                <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '700' }}>{progress}%</span>
              </div>
              <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : '#4F46E5', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 8px', overflowX: 'auto', background: 'var(--surface)' }}>
          {[
            ['tasks', 'Tasks', itemTasks.filter(t => !t.done).length],
            ['steps', 'Steps', itemSteps.length],
            ['notes', 'Notes & Activity', itemNotes.length],
            ['ideas', 'Ideas', respIdeas.length],
            ['details', 'Details', 0],
          ].map(([id, label, count]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={TAB_STYLE(activeTab === id)}>
              {label}{COUNT_BADGE(activeTab === id, count)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 80px' }}>

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button className="btn btn-sm btn-primary" style={{ fontSize: '11px' }} onClick={() => setShowTaskForm(p => !p)}>+ Add task</button>
              </div>
              {showTaskForm && (
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[['task', '☑ Task'], ['meeting', '📅 Meeting']].map(([t, l]) => (
                      <button key={t} onClick={() => setTaskForm(p => ({ ...p, task_type: t }))}
                        style={{ flex: 1, padding: '5px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: taskForm.task_type === t ? 'var(--text)' : 'var(--surface)', color: taskForm.task_type === t ? '#fff' : 'var(--text-2)' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="form-row" style={{ marginBottom: '8px' }}>
                    <div className="form-group full"><label>{taskForm.task_type === 'meeting' ? 'Meeting name' : 'Task name'}</label><input value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                    <div className="form-group"><label>Date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                    {taskForm.task_type === 'meeting' && <div className="form-group"><label>Time</label><input type="time" value={taskForm.meeting_time} onChange={e => setTaskForm(p => ({ ...p, meeting_time: e.target.value }))} /></div>}
                    <div className="form-group"><label>Assigned to</label><input value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                    {taskForm.task_type !== 'meeting' && <div className="form-group"><label>Priority</label>
                      <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </div>}
                    <div className="form-group"><label>Step</label>
                      <select value={taskForm.step_id} onChange={e => setTaskForm(p => ({ ...p, step_id: e.target.value }))}>
                        <option value="">— none —</option>
                        {itemSteps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {taskForm.task_type === 'meeting' && <div className="form-group full"><label>Attendees</label><input value={taskForm.attendees} onChange={e => setTaskForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Names separated by commas…" /></div>}
                    <div className="form-group full"><label>Notes</label><textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={handleAddTask}>Save {taskForm.task_type === 'meeting' ? 'meeting' : 'task'}</button>
                  </div>
                </div>
              )}
              {itemTasks.length === 0 && !showTaskForm && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)', fontSize: '13px' }}>No tasks yet. Add one above!</div>}
              {itemTasks.map(t => {
                const linkedStep = itemSteps.find(s => s.id === t.step_id);
                const isMtg = t.task_type === 'meeting';
                const tOv = isOverdue(t.due_date) && !t.done;
                return (
                  <div key={t.id} onClick={() => setActiveTask(t)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', marginBottom: '6px', borderRadius: '10px', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', transition: 'border-color 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div className={`cb ${t.done ? 'checked' : ''}`} style={{ marginTop: '1px', flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); onToggleTask(t.id); }}>
                      {t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)', marginBottom: '3px' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {isMtg && <span style={{ fontSize: '10px', background: '#FDEAEA', color: '#A93226', padding: '1px 6px', borderRadius: '8px', fontWeight: '600' }}>📅</span>}
                        {t.assigned_to && <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>👤 {t.assigned_to}</span>}
                        {t.due_date && <span style={{ fontSize: '10px', color: tOv ? 'var(--red)' : 'var(--text-3)', fontWeight: tOv ? '600' : '400' }}>{tOv ? '⚠ ' : ''}{fmt(t.due_date)}{t.meeting_time ? ' @ ' + t.meeting_time : ''}</span>}
                        {linkedStep && <span style={{ fontSize: '10px', color: 'var(--blue)' }}>↳ {linkedStep.name}</span>}
                      </div>
                    </div>
                    {!isMtg && <span className={`badge ${PRI_BADGE[t.priority]}`} style={{ flexShrink: 0 }}>{t.priority}</span>}
                  </div>
                );
              })}
              {/* Mark complete / Delete */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: item.completed ? 'var(--gray)' : 'var(--green)' }}
                  onClick={() => onUpdateItem(item.id, { completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null })}>
                  {item.completed ? '↩ Reopen project' : '✓ Mark complete'}
                </button>
                {!confirmDelete
                  ? <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => setConfirmDelete(true)}>Delete</button>
                  : <><button className="btn btn-sm" style={{ color: 'var(--red)', background: 'var(--red-light)', borderColor: 'var(--red)' }} onClick={handleDeleteItem}>Confirm delete</button><button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button></>}
              </div>
            </div>
          )}

          {/* ── STEPS TAB ── */}
          {activeTab === 'steps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button className="btn btn-sm btn-primary" style={{ fontSize: '11px' }} onClick={() => setShowStepForm(p => !p)}>+ Add step</button>
              </div>
              {showStepForm && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Step name…" onKeyDown={e => e.key === 'Enter' && handleAddStep()} autoFocus />
                  <button className="btn btn-sm btn-primary" onClick={handleAddStep}>Add</button>
                  <button className="btn btn-sm" onClick={() => setShowStepForm(false)}>✕</button>
                </div>
              )}
              {itemSteps.length === 0 && !showStepForm && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)', fontSize: '13px' }}>No steps/stages yet.</div>}
              {itemSteps.map((s, i) => {
                const stepTaskCount = itemTasks.filter(t => t.step_id === s.id).length;
                const stepDone = itemTasks.filter(t => t.step_id === s.id && t.done).length;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '6px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className={`cb round ${s.done ? 'checked' : ''}`} onClick={() => onToggleStep(s.id)} style={{ flexShrink: 0 }}>{s.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}</div>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-3)' : 'var(--text)' }}>{i + 1}. {s.name}</span>
                    {stepTaskCount > 0 && <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '8px' }}>{stepDone}/{stepTaskCount} tasks</span>}
                    <button className="btn-icon" style={{ fontSize: '12px', color: 'var(--text-3)' }} onClick={() => onDeleteStep(s.id)}>🗑</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── NOTES & ACTIVITY TAB ── */}
          {activeTab === 'notes' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note or update on this project…" onKeyDown={e => e.key === 'Enter' && handleAddNote()} style={{ flex: 1 }} />
                <button className="btn btn-sm btn-primary" onClick={handleAddNote} style={{ whiteSpace: 'nowrap' }}>Post</button>
              </div>
              {itemNotes.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)', fontSize: '13px' }}>No notes yet. Add the first one above!</div>}
              {[...itemNotes].reverse().map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--green-text)', flexShrink: 0 }}>C</div>
                  <div style={{ flex: 1, background: '#F0FBF7', border: '1px solid #C8EDD8', borderRadius: '0 10px 10px 10px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', color: '#2D7A5A', lineHeight: '1.6' }}>{n.text}</div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      <button style={{ fontSize: '10px', color: 'var(--text-3)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} onClick={() => onDeleteNote(n.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── IDEAS TAB ── */}
          {activeTab === 'ideas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--blue)' }} onClick={onGoIdeas}>View all ideas →</button>
              </div>
              {respIdeas.length === 0 ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)', fontSize: '13px' }}>No ideas for {item.responsibility} yet.</div> :
                respIdeas.map(idea => (
                  <div key={idea.id} style={{ padding: '10px 12px', marginBottom: '6px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={onGoIdeas}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>💡 {idea.title}</div>
                    {idea.body && <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5' }}>{idea.body}</div>}
                  </div>
                ))}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div>
              {!editingItem ? (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    {[
                      ['Project name', item.name],
                      ['Type', item.type],
                      ['Facility', facility?.name || '—'],
                      ['Responsibility', item.responsibility],
                      ['Due date', item.due_date ? fmt(item.due_date) : '—'],
                      ['Assigned to', item.assigned_to || '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', width: '100px', flexShrink: 0, paddingTop: '2px' }}>{label}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={startEditItem}>Edit details</button>
                </div>
              ) : (
                <div>
                  <div className="form-row">
                    <div className="form-group full"><label>Name</label><input value={itemEditForm.name} onChange={e => setItemEditForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                    <div className="form-group"><label>Type</label>
                      <select value={itemEditForm.type} onChange={e => setItemEditForm(p => ({ ...p, type: e.target.value }))}>
                        <option value="project">Project</option><option value="event">Event</option><option value="meeting">Meeting</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Responsibility</label>
                      <select value={itemEditForm.responsibility} onChange={e => setItemEditForm(p => ({ ...p, responsibility: e.target.value }))}>
                        {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Due date</label><input type="date" value={itemEditForm.due_date} onChange={e => setItemEditForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                    <div className="form-group"><label>Assigned to</label><input value={itemEditForm.assigned_to} onChange={e => setItemEditForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-sm" onClick={() => setEditingItem(false)}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={saveEditItem}>Save</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

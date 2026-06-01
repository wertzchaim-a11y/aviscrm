import React, { useState } from 'react';

const RESP_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };
const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
function isOverdue(d) { if (!d) return false; return d < new Date().toISOString().slice(0, 10); }

export default function ItemSheet({ item, facility, steps, tasks, notes, ideas, onClose, onUpdateItem, onDeleteItem, onAddStep, onToggleStep, onDeleteStep, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onAddNote, onDeleteNote, onGoIdeas, calcProgress }) {
  const [activeTask, setActiveTask] = useState(null);
  const [editingTask, setEditingTask] = useState(false);
  const [showStepForm, setShowStepForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newNote, setNewNote] = useState('');
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', assigned_to: '', priority: 'Medium', step_id: '', notes: '' });
  const [editForm, setEditForm] = useState({});
  const [manualVal, setManualVal] = useState(item.progress);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progress = calcProgress(item);
  const itemSteps = steps.filter(s => s.item_id === item.id);
  const itemTasks = tasks.filter(t => t.item_id === item.id);
  const itemNotes = notes.filter(n => n.item_id === item.id);
  const respIdeas = ideas.filter(i => i.responsibility === item.responsibility);
  const today = new Date().toISOString().slice(0, 10);

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    await onAddStep({ item_id: item.id, name: newStep.trim() });
    setNewStep(''); setShowStepForm(false);
  };
  const handleAddTask = async () => {
    if (!taskForm.name.trim()) return;
    await onAddTask({ ...taskForm, item_id: item.id, step_id: taskForm.step_id || null });
    setTaskForm({ name: '', due_date: '', assigned_to: '', priority: 'Medium', step_id: '', notes: '' });
    setShowTaskForm(false);
  };
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await onAddNote({ item_id: item.id, text: newNote.trim() });
    setNewNote(''); setShowNoteForm(false);
  };
  const handleSaveEdit = async () => {
    await onUpdateTask(activeTask.id, editForm);
    setActiveTask({ ...activeTask, ...editForm });
    setEditingTask(false);
  };
  const handleToggleManual = () => {
    const newManual = !item.manual_progress;
    onUpdateItem(item.id, { manual_progress: newManual, progress: newManual ? progress : 0 });
    setManualVal(progress);
  };
  const handleManualSlider = (v) => {
    setManualVal(parseInt(v));
    onUpdateItem(item.id, { progress: parseInt(v) });
  };
  const handleDeleteItem = async () => {
    await onDeleteItem(item.id);
    onClose();
  };

  // TASK DETAIL VIEW
  if (activeTask) {
    const step = itemSteps.find(s => s.id === activeTask.step_id);
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setActiveTask(null)}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{activeTask.name}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className={`badge ${PRI_BADGE[activeTask.priority]}`}>{activeTask.priority}</span>
                {activeTask.assigned_to && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>{activeTask.assigned_to}</span>}
                {activeTask.due_date && <span className="badge" style={{ background: isOverdue(activeTask.due_date) && !activeTask.done ? 'var(--red-light)' : 'var(--gray-light)', color: isOverdue(activeTask.due_date) && !activeTask.done ? 'var(--red)' : 'var(--gray)' }}>{fmt(activeTask.due_date)}</span>}
                {step && <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>Step: {step.name}</span>}
                <span className="badge" style={{ background: activeTask.done ? 'var(--green-light)' : 'var(--gray-light)', color: activeTask.done ? 'var(--green-text)' : 'var(--gray)' }}>{activeTask.done ? 'Done' : 'Open'}</span>
              </div>
            </div>
            <button className="btn-icon" onClick={() => setActiveTask(null)} style={{ fontSize: '18px' }}>×</button>
          </div>
          {activeTask.notes && !editingTask && (
            <div style={{ margin: '12px 16px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6' }}>{activeTask.notes}</div>
          )}
          {editingTask ? (
            <div style={{ padding: '16px' }}>
              <div className="form-row" style={{ marginBottom: '10px' }}>
                <div className="form-group full"><label>Task name</label><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label>Due date</label><input type="date" value={editForm.due_date || ''} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div className="form-group"><label>Assigned to</label><input value={editForm.assigned_to || ''} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                <div className="form-group"><label>Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div className="form-group"><label>Step / Stage</label>
                  <select value={editForm.step_id || ''} onChange={e => setEditForm(p => ({ ...p, step_id: e.target.value || null }))}>
                    <option value="">— none —</option>
                    {itemSteps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group full"><label>Notes</label><textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="form-actions">
                <button className="btn btn-sm" onClick={() => setEditingTask(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save changes</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => { setEditForm({ name: activeTask.name, due_date: activeTask.due_date, assigned_to: activeTask.assigned_to, priority: activeTask.priority, step_id: activeTask.step_id, notes: activeTask.notes }); setEditingTask(true); }}>Edit</button>
              <button className="btn btn-sm btn-primary" onClick={async () => { await onToggleTask(activeTask.id); setActiveTask(p => ({ ...p, done: !p.done })); }}>{activeTask.done ? 'Mark open' : 'Mark done'}</button>
              <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)', marginLeft: 'auto' }} onClick={async () => { await onDeleteTask(activeTask.id); setActiveTask(null); }}>Delete task</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '1.3', flex: 1, paddingRight: '12px' }}>{item.name}</h2>
            <button className="btn-icon" onClick={onClose} style={{ fontSize: '18px' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>{facility?.name}</span>
            <span className={`badge ${RESP_BADGE[item.responsibility]}`}>{item.responsibility}</span>
            <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`}>{item.type}</span>
            {item.due_date && <span className="badge" style={{ background: isOverdue(item.due_date) ? 'var(--red-light)' : 'var(--gray-light)', color: isOverdue(item.due_date) ? 'var(--red)' : 'var(--gray)' }}>{isOverdue(item.due_date) ? 'Overdue: ' : 'Due: '}{fmt(item.due_date)}</span>}
            {item.assigned_to && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>{item.assigned_to}</span>}
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div className="prog-bg" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${item.manual_progress ? manualVal : progress}%` }} /></div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2)', minWidth: '32px' }}>{item.manual_progress ? manualVal : progress}%</span>
            <button className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 9px' }} onClick={handleToggleManual}>{item.manual_progress ? 'Auto' : 'Manual'}</button>
          </div>
          {item.manual_progress && <input type="range" min="0" max="100" step="1" value={manualVal} onChange={e => handleManualSlider(e.target.value)} style={{ width: '100%', border: 'none', padding: 0, background: 'transparent' }} />}
        </div>

        {/* Steps */}
        <div className="section-hdr">
          <span className="section-ttl">Steps / Stages</span>
          <button className="btn btn-sm" style={{ fontSize: '11px' }} onClick={() => setShowStepForm(p => !p)}>+ Add step</button>
        </div>
        <div style={{ padding: '0 16px' }}>
          {itemSteps.length === 0 && !showStepForm && <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '4px 0 8px' }}>No steps yet.</p>}
          {itemSteps.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <div className={`cb round ${s.done ? 'checked' : ''}`} onClick={() => onToggleStep(s.id)}>{s.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}</div>
              <span style={{ flex: 1, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-3)' : 'var(--text)' }}>{i + 1}. {s.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{itemTasks.filter(t => t.step_id === s.id).length} tasks</span>
              <button className="btn-icon" style={{ width: '24px', height: '24px', fontSize: '12px' }} onClick={() => onDeleteStep(s.id)}>🗑</button>
            </div>
          ))}
          {showStepForm && (
            <div style={{ display: 'flex', gap: '8px', margin: '8px 0', alignItems: 'center' }}>
              <input value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Step name…" onKeyDown={e => e.key === 'Enter' && handleAddStep()} autoFocus />
              <button className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddStep}>Add</button>
              <button className="btn btn-sm" onClick={() => setShowStepForm(false)}>✕</button>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="section-hdr" style={{ marginTop: '8px' }}>
          <span className="section-ttl">Tasks</span>
          <button className="btn btn-sm" style={{ fontSize: '11px' }} onClick={() => setShowTaskForm(p => !p)}>+ Add task</button>
        </div>
        <div style={{ padding: '0 16px' }}>
          {itemTasks.length === 0 && !showTaskForm && <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '4px 0 8px' }}>No tasks yet.</p>}
          {itemTasks.map(t => {
            const linkedStep = itemSteps.find(s => s.id === t.step_id);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', marginBottom: '3px', borderRadius: 'var(--radius)', cursor: 'pointer', border: '1px solid transparent' }}
                onClick={() => setActiveTask(t)}>
                <div className={`cb ${t.done ? 'checked' : ''}`} onClick={e => { e.stopPropagation(); onToggleTask(t.id); }}>{t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)' }}>{t.name}</span>
                  {linkedStep && <div style={{ fontSize: '10px', color: 'var(--blue)', marginTop: '1px' }}>↳ {linkedStep.name}</div>}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {t.due_date && <span style={{ fontSize: '11px', color: isOverdue(t.due_date) && !t.done ? 'var(--red)' : 'var(--text-3)' }}>{fmt(t.due_date)}</span>}
                  <span className={`badge ${PRI_BADGE[t.priority]}`}>{t.priority}</span>
                </div>
              </div>
            );
          })}
          {showTaskForm && (
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '12px', marginTop: '6px' }}>
              <div className="form-row" style={{ marginBottom: '8px' }}>
                <div className="form-group full"><label>Task name</label><input value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                <div className="form-group"><label>Due date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div className="form-group"><label>Assigned to</label><input value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                <div className="form-group"><label>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div className="form-group"><label>Step / Stage</label>
                  <select value={taskForm.step_id} onChange={e => setTaskForm(p => ({ ...p, step_id: e.target.value }))}>
                    <option value="">— none —</option>
                    {itemSteps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group full"><label>Notes</label><textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="form-actions">
                <button className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={handleAddTask}>Save task</button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="section-hdr" style={{ marginTop: '8px' }}>
          <span className="section-ttl">Notes</span>
          <button className="btn btn-sm" style={{ fontSize: '11px' }} onClick={() => setShowNoteForm(p => !p)}>+ Add note</button>
        </div>
        <div style={{ padding: '0 16px' }}>
          {itemNotes.length === 0 && !showNoteForm && <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '4px 0 8px' }}>No notes yet.</p>}
          {itemNotes.map(n => (
            <div key={n.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', marginTop: '6px', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', lineHeight: '1.6' }}>{n.text}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '11px', flexShrink: 0 }} onClick={() => onDeleteNote(n.id)}>🗑</button>
            </div>
          ))}
          {showNoteForm && (
            <div style={{ marginTop: '6px' }}>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Write a note…" autoFocus />
              <div className="form-actions">
                <button className="btn btn-sm" onClick={() => setShowNoteForm(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={handleAddNote}>Save note</button>
              </div>
            </div>
          )}
        </div>

        {/* Mark complete + Delete project */}
        <div style={{ padding: '12px 16px 8px', marginTop: '4px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: item.completed ? 'var(--gray)' : 'var(--green)' }}
            onClick={() => onUpdateItem(item.id, { completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null })}>
            {item.completed ? '↩ Reopen' : '✓ Mark complete'}
          </button>
          <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }}
            onClick={handleDeleteItem}>
            Delete
          </button>
        </div>

        {/* Ideas */}
        <div className="section-hdr" style={{ marginTop: '4px' }}>
          <span className="section-ttl">💡 Ideas for {item.responsibility}</span>
          <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--blue)' }} onClick={onGoIdeas}>View all →</button>
        </div>
        <div style={{ padding: '0 16px 24px' }}>
          {respIdeas.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-3)', padding: '4px 0' }}>No ideas saved yet.</p> :
            respIdeas.slice(0, 3).map(idea => (
              <div key={idea.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={onGoIdeas}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{idea.title}</div>
                {idea.body && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{idea.body}</div>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

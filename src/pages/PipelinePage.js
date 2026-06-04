import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
const RESP_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

const EMPTY_FORM = { name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' };

export default function PipelinePage({ data, onGoIdeas }) {
  const { facilities, items, steps, tasks, notes, ideas, addItem, updateItem, deleteItem, reorderItems, addStep, toggleStep, deleteStep, addTask, updateTask, toggleTask, deleteTask, addNote, deleteNote, addIdea, deleteIdea, calcProgress, updateFacility } = data;

  const [openItem, setOpenItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [newIdeaCol, setNewIdeaCol] = useState(null);
  const [newIdeaForm, setNewIdeaForm] = useState({ title: '', body: '' });
  const [quickSteps, setQuickSteps] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [quickIdeas, setQuickIdeas] = useState([]);
  const [stepInput, setStepInput] = useState('');
  const [taskInput, setTaskInput] = useState({ name: '', due_date: '', assigned_to: '', priority: 'Medium' });
  const [noteInput, setNoteInput] = useState('');
  const [ideaInput, setIdeaInput] = useState({ title: '', body: '' });
  const [activeTab, setActiveTab] = useState('details');
  const [summary, setSummary] = useState({});
  const [editingSummary, setEditingSummary] = useState(null);

  React.useEffect(() => {
    if (facilities.length) {
      const s = {};
      facilities.forEach(f => { if (f.summary) s[f.id] = f.summary; });
      setSummary(s);
    }
  }, [facilities]);

  const saveSummary = async (facId) => {
    await updateFacility(facId, { summary: summary[facId] || '' });
    setEditingSummary(null);
  };

  const resetForm = () => {
    setAddForm(EMPTY_FORM);
    setQuickSteps([]); setQuickTasks([]); setQuickNotes([]); setQuickIdeas([]);
    setStepInput(''); setTaskInput({ name: '', due_date: '', assigned_to: '', priority: 'Medium' });
    setNoteInput(''); setIdeaInput({ title: '', body: '' });
    setActiveTab('details');
    setShowAddForm(false);
  };

  const handleAddItem = async () => {
    if (!addForm.name.trim() || !addForm.facility_id) return;
    const newItem = await addItem({
      name: addForm.name, type: addForm.type, facility_id: addForm.facility_id,
      responsibility: addForm.responsibility, due_date: addForm.due_date || null,
      assigned_to: addForm.assigned_to || null, progress: 0, manual_progress: false, completed: false,
    });
    if (newItem) {
      for (let i = 0; i < quickSteps.length; i++) await addStep({ item_id: newItem.id, name: quickSteps[i] });
      for (const t of quickTasks) await addTask({ item_id: newItem.id, name: t.name, due_date: t.due_date || null, assigned_to: t.assigned_to || null, priority: t.priority, notes: '', step_id: null, done: false });
      for (const n of quickNotes) await addNote({ item_id: newItem.id, text: n });
      for (const id of quickIdeas) await addIdea({ title: id.title, responsibility: addForm.responsibility, body: id.body });
    }
    resetForm();
  };

  const handleAddIdea = async (resp) => {
    if (!newIdeaForm.title.trim()) return;
    await addIdea({ title: newIdeaForm.title, responsibility: resp, body: newIdeaForm.body });
    setNewIdeaForm({ title: '', body: '' });
    setNewIdeaCol(null);
  };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  const tabStyle = (t) => ({
    fontSize: '12px', padding: '5px 12px', borderRadius: '20px', fontFamily: 'var(--font)',
    fontWeight: activeTab === t ? '600' : '400', cursor: 'pointer',
    background: activeTab === t ? 'var(--text)' : 'var(--surface)',
    color: activeTab === t ? '#fff' : 'var(--text-2)',
    border: activeTab !== t ? '1px solid var(--border)' : 'none',
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Pipeline</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>+ Add item</button>
      </div>

      {facilities.map(fac => (
        <div key={fac.id} style={{ padding: '14px 16px 0' }}>
          {/* Facility header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: `2px solid ${fac.color}30` }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: fac.color, flexShrink: 0 }} />
            <span style={{ fontWeight: '600', fontSize: '15px', flex: 1 }}>{fac.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{items.filter(i => i.facility_id === fac.id).length} items</span>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: '12px', background: '#FFFEF0', border: '1px solid #E8E4A0', borderRadius: 'var(--radius-lg)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingSummary === fac.id ? '8px' : (summary[fac.id] ? '4px' : '0') }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A6E00' }}>📋 Summary</span>
              <button style={{ fontSize: '11px', color: '#7A6E00', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setEditingSummary(editingSummary === fac.id ? null : fac.id)}>
                {editingSummary === fac.id ? 'Cancel' : (summary[fac.id] ? 'Edit' : '+ Add')}
              </button>
            </div>
            {editingSummary === fac.id ? (
              <div>
                <textarea
                  autoFocus
                  value={summary[fac.id] || ''}
                  onChange={e => setSummary(p => ({ ...p, [fac.id]: e.target.value }))}
                  placeholder="Write a summary for this facility..."
                  style={{ width: '100%', fontSize: '12px', padding: '7px 9px', border: '1px solid #C8C070', borderRadius: 'var(--radius)', background: '#FFFFF5', color: 'var(--text)', resize: 'vertical', minHeight: '70px', lineHeight: '1.6', fontFamily: 'var(--font)' }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button className="btn btn-sm" onClick={() => setEditingSummary(null)}>Cancel</button>
                  <button className="btn btn-sm btn-primary" onClick={() => saveSummary(fac.id)}>Save</button>
                </div>
              </div>
            ) : summary[fac.id] ? (
              <div style={{ fontSize: '12px', color: '#5A5000', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{summary[fac.id]}</div>
            ) : (
              <div style={{ fontSize: '11px', color: '#B0A800', fontStyle: 'italic' }}>No summary yet. Tap "+ Add" to write one.</div>
            )}
          </div>

          {/* 5-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 200px', gap: '10px', marginBottom: '20px', overflowX: 'auto' }}>
            {RESP_COLS.map(resp => {
              const facItems = items.filter(i => i.facility_id === fac.id && i.responsibility === resp && !i.completed);
              return (
                <div key={resp} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '10px', minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className={`badge ${RESP_BADGE[resp]}`} style={{ fontSize: '10px' }}>{resp}</span>
                    <button onClick={() => { setAddForm(p => ({ ...p, facility_id: fac.id, responsibility: resp })); setShowAddForm(true); }}
                      style={{ fontSize: '16px', lineHeight: 1, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0 2px' }}>+</button>
                  </div>
                  {facItems.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-3)', padding: '4px 0' }}>No items</div>}
                  {facItems.map((item, idx) => {
                    const prog = calcProgress(item);
                    const overdue = isOverdue(item.due_date);
                    return (
                      <div key={item.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData('text/plain', String(idx)); e.currentTarget.style.opacity = '0.4'; }}
                        onDragEnd={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = ''; }}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--green)'; }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
                        onDrop={e => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '';
                          const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                          if (fromIdx !== idx) reorderItems(fac.id, resp, fromIdx, idx);
                        }}
                        className="card"
                        style={{ padding: '9px 10px', marginBottom: '7px', cursor: 'grab', transition: 'border-color 0.15s, opacity 0.15s' }}
                        onClick={() => setOpenItem(item.id)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', flex: 1 }}>
                            <span style={{ color: 'var(--text-3)', fontSize: '11px', marginTop: '1px', flexShrink: 0 }}>⠿</span>
                            <span style={{ fontWeight: '600', fontSize: '12px', lineHeight: '1.3' }}>{item.name}</span>
                          </div>
                          <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`} style={{ fontSize: '9px', padding: '1px 5px', flexShrink: 0 }}>{item.type}</span>
                        </div>
                        {item.due_date ? <div style={{ fontSize: '10px', color: overdue ? 'var(--red)' : 'var(--text-3)', marginBottom: '5px' }}>{overdue ? 'Overdue: ' : 'Due: '}{fmt(item.due_date)}</div>
                          : <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '5px' }}>No due date</div>}
                        <div className="prog-bg"><div className="prog-fill" style={{ width: `${prog}%` }} /></div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{prog}%{item.assigned_to ? ' · ' + item.assigned_to : ''}</div>
                      </div>
                    );
                  })}
                  <button onClick={() => { setAddForm(p => ({ ...p, facility_id: fac.id, responsibility: resp })); setShowAddForm(true); }}
                    style={{ width: '100%', fontSize: '11px', padding: '5px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-md)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: '4px' }}>
                    + Add
                  </button>
                </div>
              );
            })}

            {/* Ideas column */}
            <div style={{ background: '#FFFEF0', border: '1px solid #E8E4A0', borderRadius: 'var(--radius-lg)', padding: '10px', minWidth: '160px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A6E00' }}>💡 Ideas</span>
                <button onClick={() => setNewIdeaCol({ resp: 'Marketing' })}
                  style={{ fontSize: '16px', lineHeight: 1, background: 'transparent', border: 'none', color: '#7A6E00', cursor: 'pointer', padding: '0 2px' }}>+</button>
              </div>
              {RESP_COLS.map(resp => {
                const respIdeas = ideas.filter(i => i.responsibility === resp);
                if (respIdeas.length === 0) return null;
                return (
                  <div key={resp} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#7A6E00', marginBottom: '4px', opacity: 0.7 }}>{resp}</div>
                    {respIdeas.map(idea => (
                      <div key={idea.id} style={{ background: '#FFFFF5', border: '1px solid #E8E4A0', borderRadius: 'var(--radius)', padding: '7px 8px', marginBottom: '5px', cursor: 'pointer' }}
                        onClick={() => onGoIdeas(idea.responsibility)}>
                        <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.3', marginBottom: '2px' }}>{idea.title}</div>
                        {idea.body && <div style={{ fontSize: '10px', color: '#7A6E00', lineHeight: '1.4' }}>{idea.body.length > 60 ? idea.body.slice(0, 60) + '…' : idea.body}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
              {ideas.length === 0 && <div style={{ fontSize: '11px', color: '#7A6E00', opacity: 0.6, padding: '4px 0' }}>No ideas yet</div>}
              <button onClick={() => setNewIdeaCol({ resp: 'Marketing' })}
                style={{ width: '100%', fontSize: '11px', padding: '5px', borderRadius: 'var(--radius)', border: '1px dashed #C8C070', background: 'transparent', color: '#7A6E00', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: '4px' }}>
                + Add idea
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ADD ITEM MODAL */}
      {showAddForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="sheet-center" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add project or event</h2>
              <button className="btn-icon" onClick={resetForm} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '16px' }}>
              {[['details','Details'],['steps','Steps'],['tasks','Tasks'],['notes','Notes'],['ideas','Ideas']].map(([t, l]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
                  {l}{t === 'steps' && quickSteps.length > 0 ? ` (${quickSteps.length})` : ''}
                  {t === 'tasks' && quickTasks.length > 0 ? ` (${quickTasks.length})` : ''}
                  {t === 'notes' && quickNotes.length > 0 ? ` (${quickNotes.length})` : ''}
                  {t === 'ideas' && quickIdeas.length > 0 ? ` (${quickIdeas.length})` : ''}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <div className="form-row">
                <div className="form-group full"><label>Name *</label><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} autoFocus placeholder="Project or event name" /></div>
                <div className="form-group"><label>Type</label>
                  <select value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="project">Project</option><option value="event">Event</option>
                  </select>
                </div>
                <div className="form-group"><label>Facility *</label>
                  <select value={addForm.facility_id} onChange={e => setAddForm(p => ({ ...p, facility_id: e.target.value }))}>
                    <option value="">Select facility…</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Responsibility</label>
                  <select value={addForm.responsibility} onChange={e => setAddForm(p => ({ ...p, responsibility: e.target.value }))}>
                    {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Due date (optional)</label><input type="date" value={addForm.due_date} onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div className="form-group"><label>Assigned to (optional)</label><input value={addForm.assigned_to} onChange={e => setAddForm(p => ({ ...p, assigned_to: e.target.value }))} placeholder="Name" /></div>
              </div>
            )}

            {activeTab === 'steps' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input value={stepInput} onChange={e => setStepInput(e.target.value)} placeholder="Step name…" onKeyDown={e => { if (e.key === 'Enter' && stepInput.trim()) { setQuickSteps(p => [...p, stepInput.trim()]); setStepInput(''); }}} autoFocus />
                  <button className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => { if (stepInput.trim()) { setQuickSteps(p => [...p, stepInput.trim()]); setStepInput(''); }}}>Add</button>
                </div>
                {quickSteps.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No steps yet.</div> :
                  quickSteps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '1.5px solid var(--border-md)', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{i + 1}. {s}</span>
                      <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => setQuickSteps(p => p.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <div className="form-row" style={{ marginBottom: '10px' }}>
                  <div className="form-group full"><label>Task name</label><input value={taskInput.name} onChange={e => setTaskInput(p => ({ ...p, name: e.target.value }))} placeholder="Task name…" autoFocus /></div>
                  <div className="form-group"><label>Due date</label><input type="date" value={taskInput.due_date} onChange={e => setTaskInput(p => ({ ...p, due_date: e.target.value }))} /></div>
                  <div className="form-group"><label>Assigned to</label><input value={taskInput.assigned_to} onChange={e => setTaskInput(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  <div className="form-group"><label>Priority</label>
                    <select value={taskInput.priority} onChange={e => setTaskInput(p => ({ ...p, priority: e.target.value }))}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-sm btn-primary" style={{ marginBottom: '12px' }} onClick={() => { if (taskInput.name.trim()) { setQuickTasks(p => [...p, { ...taskInput }]); setTaskInput({ name: '', due_date: '', assigned_to: '', priority: 'Medium' }); }}}>Add task</button>
                {quickTasks.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No tasks yet.</div> :
                  quickTasks.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid var(--border-md)', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{t.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{t.priority}</span>
                      <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => setQuickTasks(p => p.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Write a note…" style={{ minHeight: '80px', width: '100%' }} autoFocus />
                <button className="btn btn-sm btn-primary" style={{ marginTop: '8px', marginBottom: '12px' }} onClick={() => { if (noteInput.trim()) { setQuickNotes(p => [...p, noteInput.trim()]); setNoteInput(''); }}}>Add note</button>
                {quickNotes.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No notes yet.</div> :
                  quickNotes.map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', marginTop: '5px', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{n}</span>
                      <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => setQuickNotes(p => p.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'ideas' && (
              <div>
                <div className="form-row" style={{ marginBottom: '10px' }}>
                  <div className="form-group full"><label>Idea title</label><input value={ideaInput.title} onChange={e => setIdeaInput(p => ({ ...p, title: e.target.value }))} placeholder="What's the idea?" autoFocus /></div>
                  <div className="form-group full"><label>Details (optional)</label><textarea value={ideaInput.body} onChange={e => setIdeaInput(p => ({ ...p, body: e.target.value }))} placeholder="Describe it…" /></div>
                </div>
                <button className="btn btn-sm btn-primary" style={{ marginBottom: '12px' }} onClick={() => { if (ideaInput.title.trim()) { setQuickIdeas(p => [...p, { ...ideaInput }]); setIdeaInput({ title: '', body: '' }); }}}>Add idea</button>
                {quickIdeas.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No ideas yet.</div> :
                  quickIdeas.map((id, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <span style={{ fontSize: '14px' }}>💡</span>
                      <span style={{ flex: 1 }}>{id.title}</span>
                      <button className="btn-icon" style={{ width: '22px', height: '22px', fontSize: '12px' }} onClick={() => setQuickIdeas(p => p.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))
                }
              </div>
            )}

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button className="btn btn-sm" onClick={resetForm}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleAddItem}>Save project</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD IDEA SHEET */}
      {newIdeaCol && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setNewIdeaCol(null)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>💡 Add idea</h2>
              <button className="btn-icon" onClick={() => setNewIdeaCol(null)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group full"><label>Title</label><input value={newIdeaForm.title} onChange={e => setNewIdeaForm(p => ({ ...p, title: e.target.value }))} autoFocus /></div>
              <div className="form-group full"><label>Responsibility</label>
                <select value={newIdeaCol.resp} onChange={e => setNewIdeaCol({ resp: e.target.value })}>
                  {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group full"><label>Details</label><textarea value={newIdeaForm.body} onChange={e => setNewIdeaForm(p => ({ ...p, body: e.target.value }))} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setNewIdeaCol(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={() => handleAddIdea(newIdeaCol.resp)}>Save idea</button>
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
          onGoIdeas={() => { setOpenItem(null); onGoIdeas(openItemObj.responsibility); }}
          calcProgress={calcProgress}
        />
      )}
    </div>
  );
}

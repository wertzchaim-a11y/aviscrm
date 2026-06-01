import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
const RESP_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

export default function PipelinePage({ data, onGoIdeas }) {
  const { facilities, items, steps, tasks, notes, ideas, addItem, updateItem, deleteItem, addStep, toggleStep, deleteStep, addTask, updateTask, toggleTask, deleteTask, addNote, deleteNote, addIdea, deleteIdea, calcProgress } = data;
  const [openItem, setOpenItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });
  const [newIdeaCol, setNewIdeaCol] = useState(null);
  const [newIdeaForm, setNewIdeaForm] = useState({ title: '', body: '' });

  const handleAddItem = async () => {
    if (!addForm.name.trim() || !addForm.facility_id) return;
    await addItem(addForm);
    setAddForm({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });
    setShowAddForm(false);
  };

  const handleAddIdea = async (resp) => {
    if (!newIdeaForm.title.trim()) return;
    await addIdea({ title: newIdeaForm.title, responsibility: resp, body: newIdeaForm.body });
    setNewIdeaForm({ title: '', body: '' });
    setNewIdeaCol(null);
  };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Pipeline</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>+ Add item</button>
      </div>

      {facilities.map(fac => (
        <div key={fac.id} style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${fac.color}30` }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: fac.color, flexShrink: 0 }} />
            <span style={{ fontWeight: '600', fontSize: '15px', flex: 1 }}>{fac.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{items.filter(i => i.facility_id === fac.id).length} items</span>
          </div>

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
                  {facItems.map(item => {
                    const prog = calcProgress(item);
                    const overdue = isOverdue(item.due_date);
                    return (
                      <div key={item.id} className="card" style={{ padding: '9px 10px', marginBottom: '7px', cursor: 'pointer' }} onClick={() => setOpenItem(item.id)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '12px', lineHeight: '1.3', flex: 1 }}>{item.name}</span>
                          <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>{item.type}</span>
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

      {showAddForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add project or event</h2>
              <button className="btn-icon" onClick={() => setShowAddForm(false)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group full"><label>Name</label><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="form-group"><label>Type</label>
                <select value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="project">Project</option><option value="event">Event</option>
                </select>
              </div>
              <div className="form-group"><label>Facility</label>
                <select value={addForm.facility_id} onChange={e => setAddForm(p => ({ ...p, facility_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Responsibility</label>
                <select value={addForm.responsibility} onChange={e => setAddForm(p => ({ ...p, responsibility: e.target.value }))}>
                  {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Due date</label><input type="date" value={addForm.due_date} onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div className="form-group"><label>Assigned to</label><input value={addForm.assigned_to} onChange={e => setAddForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleAddItem}>Save</button>
            </div>
          </div>
        </div>
      )}

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
          onUpdateItem={updateItem} onAddStep={addStep} onToggleStep={toggleStep} onDeleteStep={deleteStep}
          onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
          onAddNote={addNote} onDeleteNote={deleteNote}
          onGoIdeas={() => { setOpenItem(null); onGoIdeas(openItemObj.responsibility); }}
          calcProgress={calcProgress}
        />
      )}
    </div>
  );
}

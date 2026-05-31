import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
const RESP_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

export default function PipelinePage({ data, onGoIdeas }) {
  const { facilities, items, steps, tasks, notes, ideas, addItem, updateItem, deleteItem, addStep, toggleStep, deleteStep, addTask, updateTask, toggleTask, deleteTask, addNote, deleteNote, calcProgress } = data;
  const [openItem, setOpenItem] = useState(null);
  const [selectedFac, setSelectedFac] = useState(null);
  const [activeResp, setActiveResp] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });

  const getResp = (facId) => activeResp[facId] || RESP_COLS[0];

  const handleAddItem = async () => {
    if (!addForm.name.trim() || !addForm.facility_id) return;
    await addItem(addForm);
    setAddForm({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });
    setShowAddForm(false);
  };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Pipeline</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>+ Add item</button>
      </div>

      {/* Facilities */}
      {facilities.map(fac => {
        const resp = getResp(fac.id);
        const facItems = items.filter(i => i.facility_id === fac.id && i.responsibility === resp);
        const ideaCount = ideas.filter(id => id.responsibility === resp).length;
        return (
          <div key={fac.id} style={{ padding: '14px 16px 0' }}>
            {/* Facility header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `2px solid ${fac.color}20` }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: fac.color, flexShrink: 0 }} />
              <span style={{ fontWeight: '600', fontSize: '15px', flex: 1 }}>{fac.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{items.filter(i => i.facility_id === fac.id).length} items</span>
            </div>
            {/* Responsibility tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '2px' }}>
              {RESP_COLS.map(r => (
                <button key={r} onClick={() => setActiveResp(p => ({ ...p, [fac.id]: r }))}
                  style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap', border: 'none', fontFamily: 'var(--font)', fontWeight: r === resp ? '600' : '400', background: r === resp ? 'var(--text)' : 'var(--surface)', color: r === resp ? 'var(--bg)' : 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {r}
                </button>
              ))}
              {ideaCount > 0 && (
                <button onClick={() => onGoIdeas(resp)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--blue)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>
                  💡 {ideaCount}
                </button>
              )}
              <button onClick={() => { setAddForm(p => ({ ...p, facility_id: fac.id, responsibility: resp })); setShowAddForm(true); }}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>+ Add</button>
            </div>
            {/* Cards */}
            {facItems.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '8px 0 14px' }}>No items for {resp}.</div>
            ) : facItems.map(item => {
              const prog = calcProgress(item);
              const ov = isOverdue(item.due_date);
              return (
                <div key={item.id} className="card" style={{ padding: '11px 13px', marginBottom: '8px', cursor: 'pointer' }} onClick={() => setOpenItem(item.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', lineHeight: '1.4', flex: 1 }}>{item.name}</span>
                    <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`}>{item.type}</span>
                  </div>
                  {item.due_date ? <div style={{ fontSize: '11px', color: ov ? 'var(--red)' : 'var(--text-3)', marginBottom: '6px' }}>{ov ? 'Overdue: ' : 'Due: '}{fmt(item.due_date)}{item.assigned_to ? ' · ' + item.assigned_to : ''}</div>
                    : <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px' }}>No due date{item.assigned_to ? ' · ' + item.assigned_to : ''}</div>}
                  <div className="prog-bg"><div className="prog-fill" style={{ width: `${prog}%` }} /></div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{prog}% · {tasks.filter(t => t.item_id === item.id && !t.done).length} tasks open</div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Add item sheet */}
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

      {/* Item detail sheet */}
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

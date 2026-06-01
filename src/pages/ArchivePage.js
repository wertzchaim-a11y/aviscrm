import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }

export default function ArchivePage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, addStep, toggleStep, deleteStep, addTask, updateItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, calcProgress } = data;
  const [openItem, setOpenItem] = useState(null);
  const [facFilter, setFacFilter] = useState('');
  const [respFilter, setRespFilter] = useState('');
  const [search, setSearch] = useState('');

  const completed = items.filter(i => i.completed)
    .filter(i => !facFilter || i.facility_id === facFilter)
    .filter(i => !respFilter || i.responsibility === respFilter)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  const handleReopen = async (id) => {
    await updateItem(id, { completed: false, completed_at: null });
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>✅ Completed</h1>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
          <select value={facFilter} onChange={e => setFacFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', maxWidth: '110px', minWidth: 0 }}>
            <option value="">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={respFilter} onChange={e => setRespFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', maxWidth: '110px', minWidth: 0 }}>
            <option value="">All resp.</option>
            <option>Marketing</option><option>Employee retention</option><option>Recruitment</option><option>Other</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ fontSize: '11px', padding: '4px 7px', height: '26px', maxWidth: '90px', minWidth: '70px' }} />
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {completed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>No completed projects yet</div>
            <div style={{ fontSize: '12px' }}>When you mark a project or event as complete, it will appear here.</div>
          </div>
        ) : completed.map(item => {
          const fac = facilities.find(f => f.id === item.facility_id);
          const prog = calcProgress(item);
          const itemTasks = tasks.filter(t => t.item_id === item.id);
          const doneTasks = itemTasks.filter(t => t.done).length;
          return (
            <div key={item.id} className="card" style={{ padding: '12px 14px', marginBottom: '8px', opacity: 0.85 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: '700' }}>✓</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px', cursor: 'pointer', textDecoration: 'line-through', color: 'var(--text-2)' }} onClick={() => setOpenItem(item.id)}>{item.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-3)' }}>
                    {fac && <span>{fac.name}</span>}
                    <span>· {item.responsibility}</span>
                    <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`} style={{ fontSize: '10px' }}>{item.type}</span>
                    {item.completed_at && <span>· Completed {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
                <button className="btn btn-sm" style={{ fontSize: '11px', whiteSpace: 'nowrap' }} onClick={() => handleReopen(item.id)}>Reopen</button>
              </div>
              <div style={{ paddingLeft: '28px' }}>
                <div className="prog-bg" style={{ marginBottom: '3px' }}><div className="prog-fill" style={{ width: '100%' }} /></div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{doneTasks}/{itemTasks.length} tasks done</div>
              </div>
            </div>
          );
        })}
      </div>

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

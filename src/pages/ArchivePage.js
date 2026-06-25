import React, { useState, useMemo } from 'react';
import ItemSheet from '../components/ItemSheet';
 
function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
 
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
 
function getDateGroup(iso) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
  const taskDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
 
  if (taskDay >= today) return 'Today';
  if (taskDay >= yesterday) return 'Yesterday';
  if (taskDay >= weekAgo) return 'This week';
  if (taskDay >= monthAgo) return 'This month';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
 
const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'This month'];
 
export default function ArchivePage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, facilityNotes = [], addStep, toggleStep, deleteStep, addTask, updateItem, deleteItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, calcProgress } = data;
  const [activeSection, setActiveSection] = useState('tasks');
  const [openItem, setOpenItem] = useState(null);
  const [facFilter, setFacFilter] = useState('');
  const [search, setSearch] = useState('');
 
  // ── COMPLETED TASKS ──
  const doneTasks = useMemo(() => {
    return tasks
      .filter(t => t.done)
      .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
      .filter(t => {
        if (!facFilter) return true;
        const item = items.find(i => i.id === t.item_id);
        return item?.facility_id === facFilter;
      })
      .sort((a, b) => (b.completed_at || b.created_at || '').localeCompare(a.completed_at || a.created_at || ''));
  }, [tasks, items, search, facFilter]);
 
  // Group tasks by completion date
  const taskGroups = useMemo(() => {
    const groups = {};
    doneTasks.forEach(t => {
      const group = getDateGroup(t.completed_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(t);
    });
    return groups;
  }, [doneTasks]);
 
  const groupKeys = useMemo(() => {
    return Object.keys(taskGroups).sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a);
      const bi = GROUP_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.localeCompare(a); // Most recent month first
    });
  }, [taskGroups]);
 
  // ── COMPLETED PROJECTS ──
  const doneItems = useMemo(() => {
    return items
      .filter(i => i.completed)
      .filter(i => !facFilter || i.facility_id === facFilter)
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));
  }, [items, facFilter, search]);
 
  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);
 
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>✅ Completed</h1>
 
        {/* Section tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {[['tasks', `Tasks (${doneTasks.length})`], ['projects', `Projects (${doneItems.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveSection(id)}
              style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: activeSection === id ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', border: activeSection === id ? 'none' : '1px solid var(--border)', background: activeSection === id ? 'var(--text)' : 'var(--surface)', color: activeSection === id ? '#fff' : 'var(--text-2)' }}>
              {label}
            </button>
          ))}
        </div>
 
        {/* Filters */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <select value={facFilter} onChange={e => setFacFilter(e.target.value)}
            style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', maxWidth: '120px', minWidth: 0 }}>
            <option value="">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ fontSize: '11px', padding: '4px 7px', height: '26px', maxWidth: '100px', minWidth: '70px' }} />
        </div>
      </div>
 
      <div style={{ padding: '12px 16px' }}>
 
        {/* ── TASKS SECTION ── */}
        {activeSection === 'tasks' && (
          doneTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>☑️</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>No completed tasks yet</div>
              <div style={{ fontSize: '12px' }}>Tasks you mark as done will appear here, sorted by when you completed them.</div>
            </div>
          ) : groupKeys.map(group => (
            <div key={group} style={{ marginBottom: '20px' }}>
              {/* Date group header */}
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{group}</span>
                <span style={{ fontSize: '10px', background: 'var(--bg)', padding: '1px 7px', borderRadius: '10px', fontWeight: '500', textTransform: 'none', letterSpacing: 0 }}>{taskGroups[group].length} task{taskGroups[group].length !== 1 ? 's' : ''}</span>
              </div>
 
              {taskGroups[group].map(t => {
                const item = items.find(i => i.id === t.item_id);
                const fac = facilities.find(f => f.id === item?.facility_id);
                const isMtg = t.task_type === 'meeting';
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', marginBottom: '6px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.85 }}>
                    {/* Done checkbox */}
                    <div className="cb checked" style={{ flexShrink: 0, marginTop: '2px', cursor: 'pointer' }}
                      onClick={() => toggleTask(t.id)}>
                      <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {/* Task name */}
                      <div style={{ fontSize: '13px', fontWeight: '600', textDecoration: 'line-through', color: 'var(--text-2)', marginBottom: '4px' }}>
                        {isMtg ? '📅 ' : ''}{t.name}
                        {t.recur_type && t.recur_type !== 'never' && <span style={{ fontSize: '10px', background: '#F0FBF7', color: '#1D9E75', padding: '1px 6px', borderRadius: '8px', fontWeight: '600', border: '1px solid #C8EDD8', marginLeft: '6px' }}>🔁</span>}
                      </div>
                      {/* Completion date — most prominent */}
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--green-text)', marginBottom: '3px' }}>
                        ✓ Completed {fmtDateTime(t.completed_at)}
                      </div>
                      {/* Meta */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-3)' }}>
                        {fac && <span>{fac.name}</span>}
                        {item && <span>· {item.name}</span>}
                        {!item && <span>· Standalone</span>}
                        {t.assigned_to && <span>· {t.assigned_to}</span>}
                        {t.due_date && <span>· Was due {fmt(t.due_date)}</span>}
                      </div>
                    </div>
                    {/* Reopen button */}
                    <button className="btn btn-sm" style={{ fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={() => toggleTask(t.id)}>
                      Reopen
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
 
        {/* ── PROJECTS SECTION ── */}
        {activeSection === 'projects' && (
          doneItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>No completed projects yet</div>
              <div style={{ fontSize: '12px' }}>When you mark a project as complete, it will appear here.</div>
            </div>
          ) : doneItems.map(item => {
            const fac = facilities.find(f => f.id === item.facility_id);
            const itemTasks = tasks.filter(t => t.item_id === item.id);
            const doneTasks = itemTasks.filter(t => t.done).length;
            return (
              <div key={item.id} className="card" style={{ padding: '12px 14px', marginBottom: '8px', opacity: 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: '700' }}>✓</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px', cursor: 'pointer', textDecoration: 'line-through', color: 'var(--text-2)' }}
                      onClick={() => setOpenItem(item.id)}>{item.name}</div>
                    {item.completed_at && (
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--green-text)', marginBottom: '3px' }}>
                        ✓ Completed {fmtDateTime(item.completed_at)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-3)' }}>
                      {fac && <span>{fac.name}</span>}
                      <span>· {item.responsibility}</span>
                      <span>· {doneTasks}/{itemTasks.length} tasks done</span>
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    onClick={() => updateItem(item.id, { completed: false, completed_at: null })}>Reopen</button>
                </div>
              </div>
            );
          })
        )}
      </div>
 
      {/* ItemSheet for completed projects */}
      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas} facilityNotes={facilityNotes}
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
 

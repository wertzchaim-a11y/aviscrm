import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
function fmt(d) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

export default function TasksPage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, addStep, toggleStep, deleteStep, addTask, updateItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, calcProgress } = data;
  const [facFilter, setFacFilter] = useState('');
  const [respFilter, setRespFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [priFilter, setPriFilter] = useState('');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState(null);

  const allPeople = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];

  const filtered = tasks.filter(t => {
    const item = items.find(i => i.id === t.item_id);
    if (!item) return false;
    if (facFilter && item.facility_id !== facFilter) return false;
    if (respFilter && item.responsibility !== respFilter) return false;
    if (personFilter && t.assigned_to !== personFilter) return false;
    if (priFilter && t.priority !== priFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    return 0;
  });

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>Tasks</h1>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <select value={facFilter} onChange={e => setFacFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 22px 4px 8px', minWidth: 0, flexShrink: 0, height: '28px' }}>
            <option value="">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={respFilter} onChange={e => setRespFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 22px 4px 8px', minWidth: 0, flexShrink: 0, height: '28px' }}>
            <option value="">All resp.</option>
            <option>Marketing</option><option>Employee retention</option><option>Recruitment</option><option>Other</option>
          </select>
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 22px 4px 8px', minWidth: 0, flexShrink: 0, height: '28px' }}>
            <option value="">All people</option>
            {allPeople.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={priFilter} onChange={e => setPriFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 22px 4px 8px', minWidth: 0, flexShrink: 0, height: '28px' }}>
            <option value="">All priorities</option>
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ fontSize: '11px', padding: '4px 8px', minWidth: '80px', height: '28px' }} />
        </div>
      </div>

      <div style={{ padding: '10px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: '13px' }}>No tasks match your filters.</div>
        ) : filtered.map(t => {
          const item = items.find(i => i.id === t.item_id);
          const fac = facilities.find(f => f.id === item?.facility_id);
          const ov = isOverdue(t.due_date) && !t.done;
          return (
            <div key={t.id} className="card" style={{ padding: '10px 12px', marginBottom: '7px', cursor: 'pointer' }} onClick={() => setOpenItem(t.item_id)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
                <div className={`cb ${t.done ? 'checked' : ''}`} style={{ marginTop: '1px' }} onClick={e => { e.stopPropagation(); data.toggleTask(t.id); }}>{t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}</div>
                <span style={{ flex: 1, fontWeight: '600', fontSize: '13px', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)', lineHeight: '1.4' }}>{t.name}</span>
                <span className={`badge ${PRI_BADGE[t.priority]}`}>{t.priority}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '25px' }}>
                {fac && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac.name}</span>}
                {item && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {item.name}</span>}
                {t.assigned_to && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {t.assigned_to}</span>}
                {t.due_date && <span style={{ fontSize: '11px', color: ov ? 'var(--red)' : 'var(--text-3)', fontWeight: ov ? '600' : '400' }}>· {ov ? 'Overdue ' : ''}{fmt(t.due_date)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas}
          onClose={() => setOpenItem(null)}
          onUpdateItem={updateItem} onAddStep={addStep} onToggleStep={toggleStep} onDeleteStep={deleteStep}
          onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
          onAddNote={addNote} onDeleteNote={deleteNote}
          onGoIdeas={() => setOpenItem(null)}
          calcProgress={calcProgress}
        />
      )}
    </div>
  );
}

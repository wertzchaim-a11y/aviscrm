import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

export default function CalendarPage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, addStep, toggleStep, deleteStep, addTask, updateItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, calcProgress } = data;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filters, setFilters] = useState({ task: true, event: true, project: true });
  const [openItem, setOpenItem] = useState(null);

  const todayStr = now.toISOString().slice(0, 10);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const monthStr = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const toggleFilter = (key) => setFilters(p => ({ ...p, [key]: !p[key] }));

  const move = (dir) => {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  // Build event map
  const evMap = {};
  const add = (date, entry) => { if (!date) return; (evMap[date] = evMap[date] || []).push(entry); };
  items.forEach(item => {
    if (filters.project && item.type === 'project' && item.due_date) add(item.due_date, { label: item.name, cls: 'proj', id: item.id });
    if (filters.event && item.type === 'event' && item.due_date) add(item.due_date, { label: item.name, cls: 'evt', id: item.id });
  });
  if (filters.task) tasks.forEach(t => { if (t.due_date) { const item = items.find(i => i.id === t.item_id); add(t.due_date, { label: t.name, cls: 'tsk', id: item?.id }); } });

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const clsColor = { proj: { bg: '#EEEDFE', color: '#3C3489' }, evt: { bg: '#E1F5EE', color: '#085041' }, tsk: { bg: '#E6F1FB', color: '#0C447C' } };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>Calendar</h1>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {[['task', 'Tasks'], ['event', 'Events'], ['project', 'Projects']].map(([key, label]) => (
            <button key={key} onClick={() => toggleFilter(key)}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: 'none', fontFamily: 'var(--font)', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', background: filters[key] ? 'var(--text)' : 'var(--surface)', color: filters[key] ? '#fff' : 'var(--text-3)', border: filters[key] ? 'none' : '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-icon" onClick={() => move(-1)}>‹</button>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>{monthStr}</span>
          <button className="btn-icon" onClick={() => move(1)}>›</button>
        </div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '2px' }}>
          {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', padding: '6px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} style={{ minHeight: '64px', background: 'var(--bg)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '3px' }}>
              <div style={{ fontSize: '10px', color: 'var(--border-md)' }}>{getDaysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1) - firstDay + i + 1}</div>
            </div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const evs = evMap[ds] || [];
            const isToday = ds === todayStr;
            return (
              <div key={d} style={{ minHeight: '64px', background: 'var(--surface)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '3px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: isToday ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: isToday ? '700' : '400', color: isToday ? '#fff' : 'var(--text-2)' }}>{d}</span>
                </div>
                {evs.slice(0, 2).map((ev, ei) => (
                  <div key={ei} onClick={() => ev.id && setOpenItem(ev.id)}
                    style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', marginBottom: '1px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...clsColor[ev.cls] }}>
                    {ev.label}
                  </div>
                ))}
                {evs.length > 2 && <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>+{evs.length - 2}</div>}
              </div>
            );
          })}
        </div>
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

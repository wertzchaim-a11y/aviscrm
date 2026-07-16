import React, { useState } from 'react';
import { TaskRow, TaskViewer, TaskEditor } from '../components/TaskModals';

export default function TasksPage({ data }) {
  const [filter, setFilter] = useState('open');
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [newTask, setNewTask] = useState(false);

  const filtered = data.tasks
    .filter(t => filter === 'all' ? true : filter === 'done' ? t.done : filter === 'important' ? t.is_priority && !t.done : !t.done)
    .sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1);

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: '820px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <div className="page-title">Tasks</div>
          <button className="btn-pill" style={{ color: 'var(--green)' }} onClick={() => setNewTask(true)}>+ Task</button>
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {[['open', 'Open'], ['important', '★ Important'], ['done', 'Done'], ['all', 'All']].map(([id, label]) => (
              <button key={id} className={`btn-pill ${filter === id ? 'active' : ''}`} style={{ border: 'none' }} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '6px 18px', marginTop: '22px' }}>
          {filtered.map(t => <TaskRow key={t.id} t={t} data={data} onOpen={setViewTask} />)}
          {filtered.length === 0 && <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>Nothing here.</div>}
        </div>
      </div>
      {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
      {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
      {newTask && <TaskEditor data={data} onClose={() => setNewTask(false)} />}
    </div>
  );
}

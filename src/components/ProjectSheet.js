import React, { useState } from 'react';
import { TaskRow, TaskViewer, TaskEditor, fmtDate } from './TaskModals';

// ?? PROJECT VIEWER (sheet) ??
export function ProjectSheet({ item, data, onClose, onEdit }) {
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const p = data.items.find(i => i.id === item.id) || item;
  const fac = data.facilities.find(f => f.id === p.facility_id);
  const projTasks = data.tasks.filter(t => t.item_id === p.id);
  const projNotes = data.notes.filter(n => n.item_id === p.id);
  const linkedMemos = data.facilityNotes.filter(n => n.item_id === p.id);
  const stream = data.recurringItems.find(r => r.id === p.stream);
  const progress = data.calcProgress(p);
  const showNoteForm = noteOpen || editingNoteId != null;

  const saveNote = async () => {
    const v = draft.trim(); if (!v) return;
    if (editingNoteId != null) await data.updateNote(editingNoteId, v);
    else await data.addNote({ item_id: p.id, text: v });
    setDraft(''); setEditingNoteId(null); setNoteOpen(false);
  };

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: '19px', fontWeight: 600, lineHeight: 1.3, textDecoration: p.completed ? 'line-through' : 'none', color: p.completed ? 'var(--text-3)' : 'var(--text)' }}>{p.name}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{fac ? fac.name + ' - ' : ''}{p.responsibility}{p.due_date ? ' - due ' + fmtDate(p.due_date) : ''}</span>
              {stream && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>~> {stream.name}</span>}
              {p.recur_type !== 'never' && p.recur_type && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>~> repeats {p.recur_type}</span>}
              {p.assigned_to && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>? {p.assigned_to}</span>}
            </div>
          </div>
          <button title="Mark important" onClick={() => data.updateItem(p.id, { is_priority: !p.is_priority })}
            style={{ border: 'none', background: 'transparent', fontSize: '17px', cursor: 'pointer', color: p.is_priority ? '#D9A24A' : '#D5D0C8' }}>*</button>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>
        <div style={{ margin: '12px 0 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}><span>Progress</span><span>{progress}%</span></div>
          <div style={{ height: '4px', background: 'var(--border-2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: progress + '%', background: '#4C9A81', borderRadius: '2px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className="btn btn-primary" onClick={() => data.toggleItemComplete(p)}>{p.completed ? '? Reopen' : 'done Mark done'}</button>
          <button className="btn" onClick={() => onEdit(p)}>Edit</button>
          {!confirmDelete
            ? <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirmDelete(true)}>Delete</button>
            : <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm btn-danger" onClick={async () => { await data.deleteItem(p.id); onClose(); }}>Confirm</button>
                <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <div className="section-label" style={{ flex: 1 }}>Tasks</div>
          <button className="link-btn green" onClick={() => setNewTaskOpen(true)}>+ Add task</button>
        </div>
        {projTasks.map(t => <TaskRow key={t.id} t={t} data={data} onOpen={setViewTask} showSub={false} />)}
        <div className="section-label" style={{ margin: '16px 0 6px' }}>Notes</div>
        {projNotes.map(n => (
          <div key={n.id} className="note-card">
            <div className="text">{n.text}</div>
            <button className="link-btn" onClick={() => { setEditingNoteId(n.id); setDraft(n.text); }}>edit</button>
            <button className="link-btn danger" onClick={() => data.deleteNote(n.id)}>?</button>
          </div>
        ))}
        {!showNoteForm && <button className="btn btn-sm" style={{ color: 'var(--green)' }} onClick={() => { setNoteOpen(true); setDraft(''); }}>+ Add note</button>}
        {showNoteForm && <>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a note? multiple lines are fine" autoFocus />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="btn btn-sm btn-primary" onClick={saveNote}>{editingNoteId != null ? 'Save note' : '+ Add note'}</button>
            <button className="btn btn-sm" onClick={() => { setNoteOpen(false); setEditingNoteId(null); setDraft(''); }}>Cancel</button>
          </div>
        </>}
        {linkedMemos.length > 0 && <>
          <div className="section-label" style={{ margin: '16px 0 6px' }}>From the Notes page</div>
          {linkedMemos.map(m => (
            <div key={m.id} style={{ padding: '9px 12px', border: '1px dashed #D5D0C8', borderRadius: '9px', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>edit {m.title}</div>
              {m.body && <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body.split('\n')[0]}</div>}
            </div>
          ))}
        </>}
        {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
        {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
        {newTaskOpen && <TaskEditor preset={{ item_id: p.id }} data={data} onClose={() => setNewTaskOpen(false)} />}
      </div>
    </div>
  );
}

// ?? PROJECT EDITOR ??
export function ProjectEditor({ item, convertIdea, data, onClose }) {
  const isEdit = !!item;
  const [f, setF] = useState(() => item ? {
    name: item.name, facility_id: item.facility_id || '', responsibility: item.responsibility || 'Marketing',
    due_date: item.due_date || '', stream: item.stream || '', recur_type: item.recur_type || 'never',
    is_priority: !!item.is_priority, assigned_to: item.assigned_to || '', note: '', quickTasks: [], taskDraft: '',
  } : {
    name: convertIdea?.title || '', facility_id: data.facilities[0]?.id || '', responsibility: convertIdea?.responsibility || 'Marketing',
    due_date: '', stream: '', recur_type: 'never', is_priority: false, assigned_to: '',
    note: convertIdea?.body || '', quickTasks: [], taskDraft: '',
  });
  const set = patch => setF(p => ({ ...p, ...patch }));

  const save = async () => {
    const v = f.name.trim(); if (!v) return;
    const rec = {
      name: v, facility_id: f.facility_id || null, responsibility: f.responsibility,
      due_date: f.due_date || null, stream: f.stream || null, recur_type: f.recur_type,
      is_priority: f.is_priority, assigned_to: f.assigned_to || null,
    };
    let id = item?.id;
    if (isEdit) await data.updateItem(id, rec);
    else { const row = await data.addItem({ ...rec, type: 'project' }); id = row?.id; }
    if (id) {
      if (f.note.trim()) await data.addNote({ item_id: id, text: f.note.trim() });
      for (const qt of f.quickTasks) await data.addTask({ name: qt, item_id: id });
      if (f.taskDraft.trim()) await data.addTask({ name: f.taskDraft.trim(), item_id: id });
      if (convertIdea) await data.deleteIdea(convertIdea.id);
    }
    onClose();
  };

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '460px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="serif" style={{ fontSize: '18px', fontWeight: 600 }}>{isEdit ? 'Edit project' : convertIdea ? 'Idea -> project' : 'New project or event'}</div>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={f.name} onChange={e => set({ name: e.target.value })} placeholder="Project or event name" autoFocus={!isEdit} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={f.facility_id} onChange={e => set({ facility_id: e.target.value })}>
              <option value="">No facility / all</option>
              {data.facilities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select value={f.responsibility} onChange={e => set({ responsibility: e.target.value })}>
              <option>Marketing</option><option>Employee retention</option><option>Recruitment</option><option>Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" value={f.due_date} onChange={e => set({ due_date: e.target.value })} />
            <select value={f.recur_type} onChange={e => set({ recur_type: e.target.value })}>
              <option value="never">Does not repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={f.stream} onChange={e => set({ stream: e.target.value })}>
              <option value="">No rhythm - one-off</option>
              {data.recurringItems.map(r => <option key={r.id} value={r.id}>~> Counts as: {r.name}</option>)}
            </select>
            <button onClick={() => set({ is_priority: !f.is_priority })}
              style={{ border: '1px solid ' + (f.is_priority ? '#E4C795' : 'var(--border)'), background: f.is_priority ? 'var(--amber-light)' : '#fff', color: f.is_priority ? 'var(--amber)' : 'var(--text-2)', borderRadius: '8px', padding: '8px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto' }}>* Important</button>
          </div>
          <input value={f.assigned_to} onChange={e => set({ assigned_to: e.target.value })} placeholder="Assigned to (optional)" />
          {!isEdit && <>
            <textarea value={f.note} onChange={e => set({ note: e.target.value })} placeholder="Note? as many lines as you need, saved to the project" style={{ minHeight: '70px' }} />
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px' }}>
              <div className="section-label" style={{ marginBottom: '6px' }}>Tasks for this project</div>
              {f.quickTasks.map((qt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
                  <span style={{ color: 'var(--green)' }}>check</span><span style={{ flex: 1 }}>{qt}</span>
                  <button className="link-btn danger" onClick={() => set({ quickTasks: f.quickTasks.filter((_, j) => j !== i) })}>?</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input value={f.taskDraft} onChange={e => set({ taskDraft: e.target.value })} placeholder="Task name?"
                  onKeyDown={e => { if (e.key === 'Enter' && f.taskDraft.trim()) set({ quickTasks: [...f.quickTasks, f.taskDraft.trim()], taskDraft: '' }); }} />
                <button className="btn btn-sm" style={{ color: 'var(--green)' }} onClick={() => { if (f.taskDraft.trim()) set({ quickTasks: [...f.quickTasks, f.taskDraft.trim()], taskDraft: '' }); }}>+ Add</button>
              </div>
            </div>
          </>}
        </div>
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

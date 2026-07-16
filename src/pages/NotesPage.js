import React, { useState } from 'react';
import { TaskRow, TaskViewer, TaskEditor } from '../components/TaskModals';
import { ProjectSheet } from '../components/ProjectSheet';

const CATEGORIES = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];

export default function NotesPage({ data }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({ id: null, title: '', body: '', facility_id: '', category: '', item_id: '' });
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [taskFromNote, setTaskFromNote] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const { facilities, items, facilityNotes, tasks } = data;

  const openComposer = (note) => {
    setForm(note
      ? { id: note.id, title: note.title || '', body: note.body || '', facility_id: note.facility_id || '', category: note.category || '', item_id: note.item_id || '' }
      : { id: null, title: '', body: '', facility_id: '', category: '', item_id: '' });
    setComposerOpen(true);
  };
  const save = async () => {
    if (!form.title.trim() && !form.body.trim()) return;
    const rec = { title: form.title.trim() || 'Untitled note', body: form.body, facility_id: form.facility_id || null, category: form.category || 'Other', item_id: form.item_id || null };
    if (form.id) await data.updateFacilityNote(form.id, rec);
    else await data.addFacilityNote(rec);
    setComposerOpen(false);
  };
  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: '760px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <div className="page-title">Notes</div>
          <button className="btn-pill" style={{ color: 'var(--green)' }} onClick={() => composerOpen ? setComposerOpen(false) : openComposer(null)}>{composerOpen ? 'Close' : '+ Note'}</button>
        </div>

        {composerOpen && (
          <div className="card" style={{ padding: '14px', marginTop: '22px' }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ fontWeight: 600, marginBottom: '8px' }} autoFocus />
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write the note? as many lines as you need" style={{ minHeight: '70px', background: 'var(--surface)' }} />
            <div style={{ display: 'flex', gap: '7px', marginTop: '8px', flexWrap: 'wrap' }}>
              <select value={form.facility_id} onChange={e => setForm(p => ({ ...p, facility_id: e.target.value }))} style={{ flex: 1, minWidth: '120px' }}>
                <option value="">No facility</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ flex: 1, minWidth: '120px' }}>
                <option value="">No category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))} style={{ flex: 1.4, minWidth: '150px' }}>
                <option value="">No project</option>
                {items.filter(i => !i.completed).map(i => {
                  const fac = facilities.find(f => f.id === i.facility_id);
                  return <option key={i.id} value={i.id}>{fac ? fac.name + ' - ' : ''}{i.name}</option>;
                })}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-sm btn-primary" onClick={save}>{form.id ? 'Save note' : '+ Add note'}</button>
              <button className="btn btn-sm" onClick={() => setComposerOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {facilityNotes.map(m => {
            const fac = facilities.find(f => f.id === m.facility_id);
            const proj = m.item_id ? items.find(i => i.id === m.item_id) : null;
            const linked = tasks.filter(t => t.facility_note_id === m.id);
            return (
              <div key={m.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.35 }}>{m.title}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{fmt(m.created_at)}</span>
                      {fac && <span className="badge" style={{ background: 'var(--border-2)', color: '#7A756C' }}>{fac.name}</span>}
                      {m.category && <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>{m.category}</span>}
                      {proj && <span onClick={() => setViewItem(proj)} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--green)', cursor: 'pointer' }}>diamond {proj.name}</span>}
                    </div>
                  </div>
                  <button className="link-btn green" onClick={() => setTaskFromNote(m)}>+ Task</button>
                  <button className="link-btn" style={{ fontSize: '11px' }} onClick={() => openComposer(m)}>Edit</button>
                  <button className="link-btn danger" style={{ fontSize: '11px' }} onClick={() => data.deleteFacilityNote(m.id)}>Delete</button>
                </div>
                {linked.length > 0 && <div style={{ marginTop: '4px' }}>
                  {linked.map(t => <TaskRow key={t.id} t={t} data={data} onOpen={setViewTask} showSub={false} />)}
                </div>}
                {m.body && <div style={{ fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--text-2)', marginTop: '10px', borderTop: '1px solid var(--border-2)', paddingTop: '10px' }}>{m.body}</div>}
              </div>
            );
          })}
          {facilityNotes.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>No notes yet - tap "+ Note".</div>}
        </div>
      </div>
      {viewTask && <TaskViewer task={viewTask} data={data} onClose={() => setViewTask(null)} onEdit={t => { setViewTask(null); setEditTask(t); }} />}
      {editTask && <TaskEditor task={editTask} data={data} onClose={() => setEditTask(null)} />}
      {taskFromNote && <TaskEditor preset={{ facility_note_id: taskFromNote.id, item_id: taskFromNote.item_id || '' }} data={data} onClose={() => setTaskFromNote(null)} />}
      {viewItem && <ProjectSheet item={viewItem} data={data} onClose={() => setViewItem(null)} onEdit={() => {}} />}
    </div>
  );
}

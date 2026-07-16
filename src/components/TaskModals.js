import React, { useState } from 'react';

export const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
export const todayStr = () => new Date().toISOString().slice(0, 10);
const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

export function taskContext(t, { items, rhythmPeriods, facilityNotes }) {
  if (t.rhythm_id) {
    const per = rhythmPeriods.find(p => p.tracker === t.rhythm_id && p.start_date === t.rhythm_start);
    return '~> ' + (t.rhythm_id === 'fundamental' ? 'Fundamental' : 'Theme') + (per ? ': ' + per.title : '');
  }
  if (t.item_id) { const p = items.find(i => i.id === t.item_id); return p ? 'diamond ' + p.name : 'Standalone'; }
  if (t.facility_note_id) { const m = facilityNotes.find(n => n.id === t.facility_note_id); return 'edit ' + (m ? m.title : 'From a note'); }
  return 'Standalone';
}

// Shared task row used across pages
export function TaskRow({ t, data, onOpen, showSub = true }) {
  const overdue = !t.done && t.due_date && t.due_date < todayStr();
  const firstNote = data.notes.find(n => n.task_id === t.id);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 0', borderTop: '1px solid var(--border-2)' }}>
      <div className={`cb ${t.done ? 'checked' : ''}`} onClick={e => { e.stopPropagation(); data.toggleTask(t.id); }}>
        {t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>done</span>}
      </div>
      <div onClick={() => onOpen(t)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: t.done ? 'var(--text-3)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>
          {t.is_priority ? '* ' : ''}{t.task_type === 'meeting' ? 'mtg ' : ''}{t.name}
        </div>
        {showSub && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {taskContext(t, data)}{firstNote ? ' - ' + firstNote.text.split('\n')[0] : ''}
        </div>}
      </div>
      {t.recur_type && t.recur_type !== 'never' && <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600, whiteSpace: 'nowrap' }}>~> {t.recur_type}</span>}
      {t.task_type !== 'meeting' && <span className={`badge ${PRI_BADGE[t.priority] || 'badge-low'}`}>{t.priority}</span>}
      <span style={{ fontSize: '11px', whiteSpace: 'nowrap', width: '48px', textAlign: 'right', color: overdue ? 'var(--red)' : 'var(--text-3)', fontWeight: overdue ? 700 : 400 }}>{fmtDate(t.due_date)}</span>
    </div>
  );
}

// ?? TASK VIEWER (read view with notes; Edit opens editor) ??
export function TaskViewer({ task, data, onClose, onEdit }) {
  const [draft, setDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const t = data.tasks.find(x => x.id === task.id) || task;
  const taskNotes = data.notes.filter(n => n.task_id === t.id);
  const showForm = noteOpen || editingNoteId != null;

  const save = async () => {
    const v = draft.trim(); if (!v) return;
    if (editingNoteId != null) await data.updateNote(editingNoteId, v);
    else await data.addNote({ task_id: t.id, text: v });
    setDraft(''); setEditingNoteId(null); setNoteOpen(false);
  };

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '460px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div className="serif" style={{ fontSize: '19px', fontWeight: 600, lineHeight: 1.3, flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)' }}>
            {t.is_priority ? '* ' : ''}{t.name}
          </div>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
          {t.task_type === 'meeting'
            ? <span className="badge" style={{ background: 'var(--rust-light)', color: 'var(--rust)' }}>mtg Meeting{t.meeting_time ? ' - ' + t.meeting_time : ''}</span>
            : <span className={`badge ${PRI_BADGE[t.priority] || 'badge-low'}`}>{t.priority}</span>}
          {t.due_date && <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Due {fmtDate(t.due_date)}</span>}
          {t.recur_type !== 'never' && t.recur_type && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>~> repeats {t.recur_type}</span>}
          {t.assigned_to && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>? {t.assigned_to}</span>}
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{taskContext(t, data)}</span>
        </div>
        {t.notes && <div style={{ margin: '12px 0 0', padding: '10px 12px', background: 'var(--bg)', borderRadius: '9px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.notes}</div>}
        <div style={{ marginTop: '14px' }}>
          <div className="section-label" style={{ marginBottom: '6px' }}>Notes</div>
          {taskNotes.map(n => (
            <div key={n.id} className="note-card">
              <div className="text">{n.text}</div>
              <button className="link-btn" onClick={() => { setEditingNoteId(n.id); setDraft(n.text); }}>edit</button>
              <button className="link-btn danger" onClick={() => data.deleteNote(n.id)}>?</button>
            </div>
          ))}
          {!showForm && <button className="btn btn-sm" style={{ color: 'var(--green)' }} onClick={() => { setNoteOpen(true); setDraft(''); setEditingNoteId(null); }}>+ Add note</button>}
          {showForm && <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a note? multiple lines are fine" autoFocus />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn btn-sm btn-primary" onClick={save}>{editingNoteId != null ? 'Save note' : '+ Add note'}</button>
              <button className="btn btn-sm" onClick={() => { setNoteOpen(false); setEditingNoteId(null); setDraft(''); }}>Cancel</button>
            </div>
          </>}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={() => data.toggleTask(t.id)}>{t.done ? '? Reopen' : 'done Mark done'}</button>
          <button className="btn" onClick={() => onEdit(t)}>Edit</button>
          <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={async () => { await data.deleteTask(t.id); onClose(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ?? TASK / MEETING EDITOR ??
export function TaskEditor({ task, preset, data, onClose }) {
  const isEdit = !!task;
  const [f, setF] = useState(() => task ? {
    name: task.name, due_date: task.due_date || '', priority: task.priority || 'Medium',
    recur_type: task.recur_type || 'never', is_priority: !!task.is_priority, note: '',
    item_id: task.item_id || '', rhythm: task.rhythm_id ? task.rhythm_id + '|' + task.rhythm_start : '',
    task_type: task.task_type || 'task', meeting_time: task.meeting_time || '', attendees: task.attendees || '',
    assigned_to: task.assigned_to || '', facility_note_id: task.facility_note_id || '',
  } : {
    name: preset?.name || '', due_date: preset?.due_date || '', priority: 'Medium', recur_type: 'never',
    is_priority: false, note: '', item_id: preset?.item_id || '',
    rhythm: preset?.rhythm_id ? preset.rhythm_id + '|' + preset.rhythm_start : '',
    task_type: preset?.task_type || 'task', meeting_time: '', attendees: '', assigned_to: '',
    facility_note_id: preset?.facility_note_id || '',
  });
  const set = patch => setF(p => ({ ...p, ...patch }));
  const isMtg = f.task_type === 'meeting';
  const rhythmOpts = data.rhythmPeriods
    .filter(p => p.start_date >= new Date(Date.now() - 32 * 864e5).toISOString().slice(0, 10))
    .map(p => ({ id: p.tracker + '|' + p.start_date, name: (p.tracker === 'fundamental' ? 'Fundamental: ' : 'Theme: ') + p.title }));

  const save = async () => {
    const v = f.name.trim(); if (!v) return;
    const [rid, rstart] = f.rhythm ? f.rhythm.split('|') : [null, null];
    const rec = {
      name: v, due_date: f.due_date || null, priority: f.priority, recur_type: f.recur_type,
      is_priority: f.is_priority, item_id: f.item_id || null, rhythm_id: rid, rhythm_start: rstart,
      task_type: f.task_type, meeting_time: isMtg ? (f.meeting_time || null) : null,
      attendees: isMtg ? (f.attendees || null) : null, assigned_to: f.assigned_to || null,
      facility_note_id: f.facility_note_id || null,
    };
    let id = task?.id;
    if (isEdit) await data.updateTask(id, rec);
    else { const row = await data.addTask(rec); id = row?.id; }
    if (f.note.trim() && id) await data.addNote({ task_id: id, text: f.note.trim() });
    onClose();
  };

  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '24px', width: '460px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="serif" style={{ fontSize: '18px', fontWeight: 600 }}>{isEdit ? 'Edit' : 'New'} {isMtg ? 'meeting' : 'task'}</div>
          <button className="btn-icon" style={{ fontSize: '18px' }} onClick={onClose}>?</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {[['task', 'check Task'], ['meeting', 'mtg Meeting']].map(([tt, l]) => (
            <button key={tt} className={`btn-pill ${f.task_type === tt ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => set({ task_type: tt })}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={f.name} onChange={e => set({ name: e.target.value })} placeholder={isMtg ? 'Meeting name' : 'Task name'} autoFocus={!isEdit} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" value={f.due_date} onChange={e => set({ due_date: e.target.value })} />
            {isMtg
              ? <input type="time" value={f.meeting_time} onChange={e => set({ meeting_time: e.target.value })} />
              : <select value={f.priority} onChange={e => set({ priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={f.recur_type} onChange={e => set({ recur_type: e.target.value })}>
              <option value="never">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option>
            </select>
            <button onClick={() => set({ is_priority: !f.is_priority })}
              style={{ border: '1px solid ' + (f.is_priority ? '#E4C795' : 'var(--border)'), background: f.is_priority ? 'var(--amber-light)' : '#fff', color: f.is_priority ? 'var(--amber)' : 'var(--text-2)', borderRadius: '8px', padding: '8px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto' }}>* Important</button>
          </div>
          {isMtg && <input value={f.attendees} onChange={e => set({ attendees: e.target.value })} placeholder="Attendees - names separated by commas" />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={f.item_id} onChange={e => set({ item_id: e.target.value })} style={{ fontSize: '11px' }}>
              <option value="">No project</option>
              {data.items.filter(i => !i.completed).map(i => {
                const fac = data.facilities.find(x => x.id === i.facility_id);
                return <option key={i.id} value={i.id}>{fac ? fac.name + ' - ' : ''}{i.name}</option>;
              })}
            </select>
            <select value={f.rhythm} onChange={e => set({ rhythm: e.target.value })} style={{ fontSize: '11px' }}>
              <option value="">No rhythm link</option>
              {rhythmOpts.map(o => <option key={o.id} value={o.id}>~> {o.name}</option>)}
            </select>
          </div>
          <input value={f.assigned_to} onChange={e => set({ assigned_to: e.target.value })} placeholder="Assigned to (optional)" />
          <textarea value={f.note} onChange={e => set({ note: e.target.value })} placeholder="Add a note? as many lines as you need (more can be added later)" style={{ minHeight: '80px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {isEdit && <button className="btn btn-danger" onClick={async () => { await data.deleteTask(task.id); onClose(true); }}>Delete</button>}
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => onClose()}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

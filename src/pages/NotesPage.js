import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
const CAT_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };

export default function NotesPage({ data, onGoToPerson }) {
  const { facilities } = data;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facFilter, setFacFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({ facility_id: '', category: 'Marketing', title: '', body: '' });
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    const { data: rows } = await supabase.from('facility_notes').select('*').order('created_at', { ascending: false });
    setNotes(rows || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.facility_id) return;
    const { data: row } = await supabase.from('facility_notes').insert(form).select().single();
    if (row) setNotes(prev => [row, ...prev]);
    setForm({ facility_id: form.facility_id, category: form.category, title: '', body: '' });
    setShowForm(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;
    const { data: row } = await supabase.from('facility_notes').update(editForm).eq('id', editingNote.id).select().single();
    if (row) setNotes(prev => prev.map(n => n.id === editingNote.id ? row : n));
    setEditingNote(null);
  };

  const handleDelete = async (id) => {
    await supabase.from('facility_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notes.filter(n => {
    if (facFilter && n.facility_id !== facFilter) return false;
    if (catFilter && n.category !== catFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !(n.body || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>📝 Notes</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add note</button>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '6px' }}>
          <select value={facFilter} onChange={e => setFacFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', maxWidth: '120px', minWidth: 0 }}>
            <option value="">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ fontSize: '11px', padding: '4px 20px 4px 7px', height: '26px', maxWidth: '120px', minWidth: 0 }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ fontSize: '11px', padding: '4px 7px', height: '26px', maxWidth: '100px', minWidth: '70px' }} />
        </div>
      </div>

      {/* Notes list */}
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>No notes yet</div>
            <div style={{ fontSize: '12px' }}>Tap "+ Add note" to write your first note.</div>
          </div>
        ) : filtered.map(note => {
          const fac = facilities.find(f => f.id === note.facility_id);
          return (
            <div key={note.id} className="card" style={{ padding: '12px 14px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', lineHeight: '1.3' }}>{note.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {fac && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac.name}</span>}
                    <span className={`badge ${CAT_BADGE[note.category] || 'badge-other'}`} style={{ fontSize: '10px' }}>{note.category}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {fmtDate(note.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 9px' }} onClick={() => { setEditForm({ facility_id: note.facility_id, category: note.category, title: note.title, body: note.body || '' }); setEditingNote(note); }}>Edit</button>
                  <button className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 9px', color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => handleDelete(note.id)}>Delete</button>
                </div>
              </div>
              {note.body && <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', whiteSpace: 'pre-wrap', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>{note.body}</div>}
            </div>
          );
        })}
      </div>

      {/* Add note modal */}
      {showForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add note</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group full"><label>Title *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Note title" autoFocus /></div>
              <div className="form-group"><label>Facility *</label>
                <select value={form.facility_id} onChange={e => setForm(p => ({ ...p, facility_id: e.target.value }))}>
                  <option value="">Select facility…</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group full"><label>Note</label><textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write your note…" style={{ minHeight: '120px' }} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSave}>Save note</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit note modal */}
      {editingNote && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setEditingNote(null)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Edit note</h2>
              <button className="btn-icon" onClick={() => setEditingNote(null)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group full"><label>Title</label><input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} autoFocus /></div>
              <div className="form-group"><label>Facility</label>
                <select value={editForm.facility_id} onChange={e => setEditForm(p => ({ ...p, facility_id: e.target.value }))}>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Category</label>
                <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group full"><label>Note</label><textarea value={editForm.body} onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))} style={{ minHeight: '120px' }} /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

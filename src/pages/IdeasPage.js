import React, { useState } from 'react';

const RESP_BADGE = { Marketing: 'badge-marketing', 'Employee retention': 'badge-retention', Recruitment: 'badge-recruitment', Other: 'badge-other' };
const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];

export default function IdeasPage({ data, initialResp }) {
  const { ideas, addIdea, deleteIdea } = data;
  const [respFilter, setRespFilter] = useState(initialResp || '');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', responsibility: initialResp || 'Marketing', body: '' });

  const filtered = ideas.filter(i => {
    if (respFilter && i.responsibility !== respFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.body || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    await addIdea(form);
    setForm({ title: '', responsibility: form.responsibility, body: '' });
    setShowForm(false);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>💡 Ideas</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New idea</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <button onClick={() => setRespFilter('')} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: 'none', fontFamily: 'var(--font)', fontWeight: !respFilter ? '600' : '400', background: !respFilter ? 'var(--text)' : 'var(--surface)', color: !respFilter ? '#fff' : 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap', border: respFilter ? '1px solid var(--border)' : 'none' }}>All</button>
          {RESP_COLS.map(r => (
            <button key={r} onClick={() => setRespFilter(r === respFilter ? '' : r)}
              style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: 'none', fontFamily: 'var(--font)', fontWeight: r === respFilter ? '600' : '400', background: r === respFilter ? 'var(--text)' : 'var(--surface)', color: r === respFilter ? '#fff' : 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap', border: r !== respFilter ? '1px solid var(--border)' : 'none' }}>
              {r}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas…" style={{ marginTop: '8px', fontSize: '13px', height: '34px' }} />
      </div>

      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: '13px' }}>
            No ideas yet. Tap "+ New idea" to capture one.
          </div>
        ) : filtered.map(idea => (
          <div key={idea.id} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className={`badge ${RESP_BADGE[idea.responsibility] || 'badge-other'}`} style={{ alignSelf: 'flex-start' }}>{idea.responsibility}</span>
            <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: '1.4' }}>{idea.title}</div>
            {idea.body && <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5', flex: 1 }}>{idea.body}</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{idea.created_at ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              <button className="btn btn-sm" style={{ fontSize: '10px', padding: '2px 8px', color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => deleteIdea(idea.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Capture an idea</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-row">
              <div className="form-group full"><label>Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What's the idea?" autoFocus /></div>
              <div className="form-group full"><label>Responsibility</label>
                <select value={form.responsibility} onChange={e => setForm(p => ({ ...p, responsibility: e.target.value }))}>
                  {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group full"><label>Details</label><textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Describe it…" /></div>
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSave}>Save idea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

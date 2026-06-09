import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PRI_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }

export default function PeoplePage({ data }) {
  const { facilities, items, tasks } = data;
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => { fetchPeople(); }, []);

  const fetchPeople = async () => {
    setLoading(true);
    const { data: rows } = await supabase.from('people').select('*').order('name');
    setPeople(rows || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { data: row } = await supabase.from('people').insert({ name: newName.trim() }).select().single();
    if (row) setPeople(prev => [...prev, row].sort((a,b) => a.name.localeCompare(b.name)));
    setNewName(''); setShowForm(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('people').delete().eq('id', id);
    setPeople(prev => prev.filter(p => p.id !== id));
    if (selectedPerson?.id === id) setSelectedPerson(null);
  };

  const filtered = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (selectedPerson) {
    const personItems = items.filter(i => i.assigned_to === selectedPerson.name);
    const personTasks = tasks.filter(t => t.assigned_to === selectedPerson.name);
    const today = new Date().toISOString().slice(0, 10);
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-sm" onClick={() => setSelectedPerson(null)}>← Back</button>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>{selectedPerson.name}</h1>
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Projects & Events ({personItems.length})</div>
            {personItems.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '12px 0' }}>No projects assigned.</div>
            : personItems.map(item => {
              const fac = facilities.find(f => f.id === item.facility_id);
              const ov = item.due_date && item.due_date < today;
              return (
                <div key={item.id} className="card" style={{ padding: '10px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{item.name}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {fac && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac.name}</span>}
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>· {item.responsibility}</span>
                        {item.due_date && <span style={{ fontSize: '11px', color: ov ? 'var(--red)' : 'var(--text-3)' }}>· {ov ? 'Overdue: ' : 'Due: '}{fmt(item.due_date)}</span>}
                      </div>
                    </div>
                    <span className={`badge ${item.type === 'project' ? 'badge-project' : 'badge-event'}`}>{item.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Tasks ({personTasks.length})</div>
            {personTasks.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '12px 0' }}>No tasks assigned.</div>
            : personTasks.sort((a,b) => {
              if (a.done !== b.done) return a.done ? 1 : -1;
              if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
              return 0;
            }).map(t => {
              const item = items.find(i => i.id === t.item_id);
              const ov = t.due_date && t.due_date < today && !t.done;
              return (
                <div key={t.id} className="card" style={{ padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div className={`cb ${t.done ? 'checked' : ''}`} style={{ marginTop: '1px', flexShrink: 0 }}>
                    {t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-3)' : 'var(--text)' }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      {item && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{item.name}</span>}
                      {t.due_date && <span style={{ fontSize: '11px', color: ov ? 'var(--red)' : 'var(--text-3)', fontWeight: ov ? '600' : '400' }}>· {ov ? 'Overdue ' : ''}{fmt(t.due_date)}</span>}
                    </div>
                  </div>
                  <span className={`badge ${PRI_BADGE[t.priority]}`}>{t.priority}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>👥 People</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add person</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…" style={{ fontSize: '13px', height: '34px' }} />
      </div>
      <div style={{ padding: '12px 16px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading…</div>
        : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>No people yet</div>
            <div style={{ fontSize: '12px' }}>Add people to track their projects and tasks.</div>
          </div>
        ) : filtered.map(person => {
          const pItems = items.filter(i => i.assigned_to === person.name && !i.completed).length;
          const pTasks = tasks.filter(t => t.assigned_to === person.name && !t.done).length;
          return (
            <div key={person.id} className="card" style={{ padding: '12px 14px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => setSelectedPerson(person)}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: 'var(--green-text)', flexShrink: 0 }}>
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{person.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                  {pItems} active project{pItems !== 1 ? 's' : ''} · {pTasks} open task{pTasks !== 1 ? 's' : ''}
                </div>
              </div>
              <span style={{ fontSize: '16px', color: 'var(--text-3)' }}>›</span>
              <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red-light)' }}
                onClick={e => { e.stopPropagation(); handleDelete(person.id); }}>Delete</button>
            </div>
          );
        })}
      </div>
      {showForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add person</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="form-actions">
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

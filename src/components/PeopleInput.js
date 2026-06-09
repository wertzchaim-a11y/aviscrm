import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function PeopleInput({ value, onChange, placeholder = 'Assign to…' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    supabase.from('people').select('*').order('name').then(({ data }) => setAllPeople(data || []));
  }, []);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(allPeople.filter(p => p.name.toLowerCase().includes(q)));
  }, [query, allPeople]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (name) => { setQuery(name); onChange(name); setShowDrop(false); };

  const handleAddNew = async () => {
    if (!query.trim()) return;
    const { data: row } = await supabase.from('people').insert({ name: query.trim() }).select().single();
    if (row) setAllPeople(prev => [...prev, row].sort((a,b) => a.name.localeCompare(b.name)));
    onChange(query.trim());
    setShowDrop(false);
  };

  const exactMatch = allPeople.some(p => p.name.toLowerCase() === query.toLowerCase());

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={query} onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowDrop(true); }}
        onFocus={() => setShowDrop(true)} placeholder={placeholder} style={{ width: '100%' }} />
      {showDrop && query.trim() && (suggestions.length > 0 || !exactMatch) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '2px' }}>
          {suggestions.map(p => (
            <div key={p.id} onClick={() => handleSelect(p.name)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--green-text)', flexShrink: 0 }}>
                {p.name.charAt(0).toUpperCase()}
              </span>
              {p.name}
            </div>
          ))}
          {!exactMatch && query.trim() && (
            <div onClick={handleAddNew}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--green)', fontWeight: '500', borderTop: suggestions.length > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '16px' }}>+</span> Add "{query.trim()}" as new person
            </div>
          )}
        </div>
      )}
    </div>
  );
}

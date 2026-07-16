import React, { useState } from 'react';
import { fmtDate } from '../components/TaskModals';
import { ProjectSheet, ProjectEditor } from '../components/ProjectSheet';

const CATS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];

export default function PipelinePage({ data, convertIdea, onConvertIdeaDone }) {
  const [tab, setTab] = useState('active');
  const [facSel, setFacSel] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [newProject, setNewProject] = useState(false);
  const [ideaForm, setIdeaForm] = useState(null); // {id?, title, body}
  const [convertingIdea, setConvertingIdea] = useState(convertIdea || null);
  const { facilities, items, ideas, recurringItems } = data;

  const facMatch = i => facSel.length === 0 || !i.facility_id || facSel.includes(i.facility_id);
  const active = items.filter(i => !i.completed && facMatch(i));
  const done = items.filter(i => i.completed && facMatch(i))
    .sort((a, b) => (b.completed_at || '') < (a.completed_at || '') ? -1 : 1);

  const saveIdea = async () => {
    const v = ideaForm.title.trim(); if (!v) return;
    if (ideaForm.id) await data.updateIdea(ideaForm.id, { title: v, body: ideaForm.body });
    else await data.addIdea({ title: v, body: ideaForm.body, responsibility: 'Marketing' });
    setIdeaForm(null);
  };

  return (
    <div className="page">
      <div className="page-inner">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <div className="page-title">Pipeline</div>
          <button className="btn-pill" style={{ color: 'var(--green)' }} onClick={() => setNewProject(true)}>+ Project</button>
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {[['active', 'Active'], ['ideas', 'Ideas'], ['done', 'Done']].map(([id, label]) => (
              <button key={id} className={`btn-pill ${tab === id ? 'active' : ''}`} style={{ border: 'none' }} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <span className="section-label" style={{ marginRight: '2px' }}>Facilities</span>
          <button className={`chip ${facSel.length === 0 ? 'active' : ''}`} onClick={() => setFacSel([])}>All</button>
          {facilities.map(f => (
            <button key={f.id} className={`chip ${facSel.includes(f.id) ? 'active' : ''}`}
              onClick={() => setFacSel(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])}>{f.name}</button>
          ))}
        </div>

        {tab === 'active' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '16px', marginTop: '26px', alignItems: 'start' }}>
            {CATS.map(cat => {
              const list = active.filter(i => i.responsibility === cat).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              if (!list.length) return null;
              const peerIds = list.map(i => i.id);
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{cat}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{list.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {list.map(i => {
                      const fac = facilities.find(f => f.id === i.facility_id);
                      const stream = recurringItems.find(r => r.id === i.stream);
                      const progress = data.calcProgress(i);
                      return (
                        <div key={i.id} className="card" style={{ borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }} onClick={() => setViewItem(i)}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{i.is_priority ? '* ' : ''}{i.name}</div>
                            <button className="link-btn" title="Move up" onClick={e => { e.stopPropagation(); data.moveItem(i.id, -1, peerIds); }}>up</button>
                            <button className="link-btn" title="Move down" onClick={e => { e.stopPropagation(); data.moveItem(i.id, 1, peerIds); }}>down</button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '7px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{fac ? fac.name : 'All facilities'}</span>
                            {stream && <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>~> {stream.name}</span>}
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: 'auto' }}>{fmtDate(i.due_date)}</span>
                          </div>
                          <div style={{ height: '3px', background: 'var(--border-2)', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: progress + '%', background: '#4C9A81', borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {active.length === 0 && <div style={{ padding: '32px 0', fontSize: '12px', color: 'var(--text-3)' }}>No active projects.</div>}
          </div>
        )}

        {tab === 'ideas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginTop: '30px' }}>
            {ideas.map(i => (
              <div key={i.id} className="card" style={{ borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>{i.title}</div>
                {i.body && <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, marginTop: '5px', whiteSpace: 'pre-wrap' }}>{i.body}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)', flex: 1 }}>{i.created_at ? fmtDate(i.created_at.slice(0, 10)) : ''}</span>
                  <button className="link-btn green" onClick={() => setConvertingIdea(i)}>-> Project</button>
                  <button className="link-btn" style={{ fontSize: '11px' }} onClick={() => setIdeaForm({ id: i.id, title: i.title, body: i.body || '' })}>Edit</button>
                  <button className="link-btn danger" style={{ fontSize: '11px' }} onClick={() => data.deleteIdea(i.id)}>Delete</button>
                </div>
              </div>
            ))}
            <div onClick={() => setIdeaForm({ title: '', body: '' })}
              style={{ border: '1px dashed #D5D0C8', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minHeight: '80px' }}>+ New idea</div>
          </div>
        )}

        {tab === 'done' && (
          <div className="card" style={{ marginTop: '30px', padding: '6px 0' }}>
            {done.length === 0 && <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>Nothing completed yet.</div>}
            {done.map(i => {
              const fac = facilities.find(f => f.id === i.facility_id);
              const stream = recurringItems.find(r => r.id === i.stream);
              return (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderTop: '1px solid var(--border-2)' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--green-light)', color: 'var(--green)', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>done</span>
                  <span onClick={() => setViewItem(i)} style={{ flex: 1, fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>{i.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{fac ? fac.name : ''}{stream ? ' - ~> ' + stream.name : ''}</span>
                  <button className="link-btn green" onClick={() => data.toggleItemComplete(i)}>? Reopen</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewItem && <ProjectSheet item={viewItem} data={data} onClose={() => setViewItem(null)} onEdit={i => { setViewItem(null); setEditItem(i); }} />}
      {editItem && <ProjectEditor item={editItem} data={data} onClose={() => setEditItem(null)} />}
      {newProject && <ProjectEditor data={data} onClose={() => setNewProject(false)} />}
      {convertingIdea && <ProjectEditor convertIdea={convertingIdea} data={data} onClose={() => { setConvertingIdea(null); onConvertIdeaDone && onConvertIdeaDone(); }} />}
      {ideaForm && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setIdeaForm(null)}>
          <div className="sheet-center" style={{ padding: '24px', width: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="serif" style={{ fontSize: '18px', fontWeight: 600 }}>{ideaForm.id ? 'Edit idea' : 'New idea'}</div>
              <button className="btn-icon" style={{ fontSize: '18px' }} onClick={() => setIdeaForm(null)}>?</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={ideaForm.title} onChange={e => setIdeaForm(p => ({ ...p, title: e.target.value }))} placeholder="Idea title" autoFocus />
              <textarea value={ideaForm.body} onChange={e => setIdeaForm(p => ({ ...p, body: e.target.value }))} placeholder="Details?" style={{ minHeight: '90px' }} />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setIdeaForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveIdea}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

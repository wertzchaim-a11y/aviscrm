import React, { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import LoginPage from './pages/LoginPage';
import TodayPage from './pages/TodayPage';
import PipelinePage from './pages/PipelinePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import RhythmsPage from './pages/RhythmsPage';
import NotesPage from './pages/NotesPage';
import PeoplePage from './pages/PeoplePage';
import { TaskEditor, TaskViewer, taskContext } from './components/TaskModals';
import { ProjectEditor, ProjectSheet } from './components/ProjectSheet';

const NAV = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'pipeline', label: 'Pipeline', icon: 'hex' },
  { id: 'tasks', label: 'Tasks', icon: 'check' },
  { id: 'calendar', label: 'Calendar', icon: 'cal' },
  { id: 'rhythms', label: 'Rhythms', icon: '~>' },
  { id: 'notes', label: 'Notes', icon: 'edit' },
  { id: 'people', label: 'People', icon: 'people' },
];
const NAV_MOBILE = NAV.slice(0, 4);
const NAV_MORE = NAV.slice(4);

function SearchBar({ data, onOpenTask, onOpenItem }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const query = q.toLowerCase().trim();
  const results = query.length < 2 ? [] : [
    ...data.tasks.filter(t => t.name.toLowerCase().includes(query)).slice(0, 3).map(t => ({
      key: 't' + t.id, label: t.name, sub: taskContext(t, data), icon: 'check', tag: 'task', go: () => onOpenTask(t) })),
    ...data.items.filter(i => i.name.toLowerCase().includes(query)).slice(0, 3).map(i => {
      const fac = data.facilities.find(f => f.id === i.facility_id);
      return { key: 'i' + i.id, label: i.name, sub: (fac ? fac.name + ' - ' : '') + i.responsibility, icon: 'diamond', tag: 'project', go: () => onOpenItem(i) };
    }),
    ...data.facilityNotes.filter(n => ((n.title || '') + ' ' + (n.body || '')).toLowerCase().includes(query)).slice(0, 2).map(n => ({
      key: 'n' + n.id, label: n.title, sub: 'Note', icon: 'edit', tag: 'note', go: null })),
  ];
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--border-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>?</span>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search anything?" style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: '13px' }} />
        {q && <button className="btn-icon" style={{ padding: 0 }} onClick={() => { setQ(''); setOpen(false); }}>?</button>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(38,36,32,.12)', zIndex: 200, marginTop: '5px', overflow: 'hidden' }}>
          {results.map(r => (
            <div key={r.key} onClick={() => { if (r.go) r.go(); setQ(''); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: r.go ? 'pointer' : 'default' }}>
              <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--green-light)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.sub}</div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{r.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const data = useData();
  const [page, setPage] = useState('today');
  const [showMore, setShowMore] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openRhythm, setOpenRhythm] = useState(null);
  const [globalTask, setGlobalTask] = useState(null);     // viewer
  const [globalItem, setGlobalItem] = useState(null);     // project sheet
  const [globalEditTask, setGlobalEditTask] = useState(null);
  const [newModal, setNewModal] = useState(null);         // 'task' | 'meeting' | 'project'

  if (authLoading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading?</div>;
  if (!user) return <LoginPage />;
  if (data.loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading data?</div>;

  const overdueBadge = data.tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length;
  const goRhythm = id => { setOpenRhythm(id); setPage('rhythms'); };

  const addOptions = [
    { icon: 'check', label: 'Task', sub: 'Standalone or inside anything', go: () => setNewModal('task') },
    { icon: 'diamond', label: 'Project or event', sub: 'Multi-step work at a facility', go: () => setNewModal('project') },
    { icon: 'mtg', label: 'Meeting', sub: 'With a date, time, and attendees', go: () => setNewModal('meeting') },
    { icon: '~>', label: 'Rhythm log', sub: 'Record an event or doctor visit', go: () => setPage('rhythms') },
    { icon: 'edit', label: 'Note', sub: 'Something worth remembering', go: () => setPage('notes') },
  ];

  const NavBtn = ({ n }) => {
    const active = page === n.id;
    return (
      <button onClick={() => { setPage(n.id); setShowMore(false); }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer', marginBottom: '2px', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'var(--font)', fontWeight: active ? 600 : 500, color: active ? 'var(--green-dark)' : 'var(--text-2)', background: active ? 'var(--green-light)' : 'transparent' }}>
        <span style={{ width: 20, textAlign: 'center', fontSize: '14px', opacity: .85 }}>{n.icon}</span>
        <span style={{ flex: 1 }}>{n.label}</span>
        {n.id === 'tasks' && overdueBadge > 0 && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', background: 'var(--red-light)', color: 'var(--red)' }}>{overdueBadge}</span>}
      </button>
    );
  };

  return (
    <>
      <nav className="desktop-sidebar" style={{ width: '216px', flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 20px 18px' }}>
          <div className="serif" style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-.2px' }}>Eminent</div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.6px', textTransform: 'uppercase', marginTop: '2px' }}>Care Group CRM</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
          {NAV.map(n => <NavBtn key={n.id} n={n} />)}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-light)', color: 'var(--green)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {(user.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            <div onClick={signOut} style={{ fontSize: '10px', color: 'var(--text-3)', cursor: 'pointer' }}>Sign out</div>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <SearchBar data={data} onOpenTask={setGlobalTask} onOpenItem={setGlobalItem} />
          <button className="btn btn-primary" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={() => setAddOpen(true)}>+ New</button>
        </div>

        {page === 'today' && <TodayPage data={data} onNavigate={setPage} onOpenRhythm={goRhythm} />}
        {page === 'pipeline' && <PipelinePage data={data} />}
        {page === 'tasks' && <TasksPage data={data} />}
        {page === 'calendar' && <CalendarPage data={data} onOpenRhythm={goRhythm} />}
        {page === 'rhythms' && <RhythmsPage data={data} openRhythm={openRhythm} onOpenRhythm={setOpenRhythm} onCloseRhythm={() => setOpenRhythm(null)} />}
        {page === 'notes' && <NotesPage data={data} />}
        {page === 'people' && <PeoplePage data={data} />}

        <nav className="mobile-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', paddingBottom: 'var(--safe-bottom)', zIndex: 50 }}>
          {NAV_MOBILE.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setShowMore(false); }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 6px', fontSize: '18px', background: 'transparent', border: 'none', cursor: 'pointer', color: page === n.id ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font)' }}>
              <span>{n.icon}</span><span style={{ fontSize: '9px', fontWeight: page === n.id ? 600 : 400 }}>{n.label}</span>
            </button>
          ))}
          <button onClick={() => setShowMore(p => !p)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 6px', fontSize: '18px', background: 'transparent', border: 'none', cursor: 'pointer', color: showMore || NAV_MORE.some(n => n.id === page) ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font)' }}>
            <span>???</span><span style={{ fontSize: '9px' }}>More</span>
          </button>
        </nav>
        {showMore && (
          <div className="mobile-only" style={{ position: 'fixed', bottom: '56px', left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', zIndex: 49, padding: '8px', flexDirection: 'column' }}>
            {NAV_MORE.map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); setShowMore(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', fontSize: '14px', background: page === n.id ? 'var(--green-light)' : 'transparent', color: page === n.id ? 'var(--green)' : 'var(--text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: page === n.id ? 600 : 400 }}>
                <span style={{ fontSize: '16px' }}>{n.icon}</span><span>{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(38,36,32,.35)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: '64px', right: '28px', width: '280px', background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 16px 48px rgba(38,36,32,.18)', zIndex: 101, padding: '8px' }}>
            {addOptions.map(o => (
              <div key={o.label} onClick={() => { setAddOpen(false); o.go(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', borderRadius: '9px', cursor: 'pointer' }}>
                <span style={{ width: 30, height: 30, borderRadius: '9px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{o.icon}</span>
                <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{o.label}</div><div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{o.sub}</div></div>
              </div>
            ))}
          </div>
        </>
      )}

      {newModal === 'task' && <TaskEditor data={data} onClose={() => setNewModal(null)} />}
      {newModal === 'meeting' && <TaskEditor preset={{ task_type: 'meeting' }} data={data} onClose={() => setNewModal(null)} />}
      {newModal === 'project' && <ProjectEditor data={data} onClose={() => setNewModal(null)} />}
      {globalTask && <TaskViewer task={globalTask} data={data} onClose={() => setGlobalTask(null)} onEdit={t => { setGlobalTask(null); setGlobalEditTask(t); }} />}
      {globalEditTask && <TaskEditor task={globalEditTask} data={data} onClose={() => setGlobalEditTask(null)} />}
      {globalItem && <ProjectSheet item={globalItem} data={data} onClose={() => setGlobalItem(null)} onEdit={() => {}} />}
    </>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

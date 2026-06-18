import React, { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import IdeasPage from './pages/IdeasPage';
import ArchivePage from './pages/ArchivePage';
import NotesPage from './pages/NotesPage';
import PeoplePage from './pages/PeoplePage';

const NAV_MAIN = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'pipeline', label: 'Pipeline', icon: '⬡' },
  { id: 'tasks', label: 'Tasks', icon: '☑' },
  { id: 'calendar', label: 'Calendar', icon: '◫' },
  { id: 'ideas', label: 'Ideas', icon: '◉' },
];
const NAV_PEOPLE = [
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'notes', label: 'Memos', icon: '📝' },
];
const NAV_OTHER = [
  { id: 'archive', label: 'Completed', icon: '✓' },
];
const NAV_MOBILE = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'pipeline', label: 'Pipeline', icon: '⬡' },
  { id: 'tasks', label: 'Tasks', icon: '☑' },
  { id: 'calendar', label: 'Calendar', icon: '◫' },
];
const NAV_MORE = [
  { id: 'ideas', label: 'Ideas', icon: '◉' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'notes', label: 'Memos', icon: '📝' },
  { id: 'archive', label: 'Completed', icon: '✓' },
];

function SearchBar({ data, onNavigate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { facilities, items, tasks } = data;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.toLowerCase().trim();
  const results = q.length < 2 ? [] : [
    ...tasks.filter(t => t.name.toLowerCase().includes(q)).slice(0, 3).map(t => {
      const item = items.find(i => i.id === t.item_id);
      const fac = facilities.find(f => f.id === item?.facility_id);
      return { type: 'task', label: t.name, sub: `${fac?.name || 'Standalone'}${item ? ' · ' + item.name : ''}${t.due_date ? ' · ' + t.due_date : ''}`, icon: '☑', bg: '#EBF3FD', color: '#0C447C', nav: 'tasks' };
    }),
    ...items.filter(i => i.name.toLowerCase().includes(q)).slice(0, 3).map(i => {
      const fac = facilities.find(f => f.id === i.facility_id);
      return { type: 'project', label: i.name, sub: `${fac?.name || ''} · ${i.responsibility}`, icon: '◆', bg: '#EEEDFE', color: '#3C3489', nav: 'pipeline' };
    }),
  ];

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: '440px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', border: `1.5px solid ${open ? 'var(--green)' : 'var(--border)'}`, borderRadius: '10px', padding: '7px 12px', transition: 'border-color 0.15s' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>🔍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search tasks, projects, memos…"
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font)' }}
        />
        {query && <button onClick={() => { setQuery(''); setOpen(false); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', fontSize: '14px', padding: 0 }}>×</button>}
        <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--surface)', borderRadius: '4px', padding: '2px 5px', flexShrink: 0 }}>⌘K</span>
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, marginTop: '4px', overflow: 'hidden' }}>
          {['task', 'project'].map(type => {
            const group = results.filter(r => r.type === type);
            if (group.length === 0) return null;
            const label = type === 'task' ? 'Tasks' : type === 'project' ? 'Projects' : 'Memos';
            return (
              <div key={type}>
                <div style={{ padding: '7px 14px 3px', fontSize: '10px', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
                {group.map((r, i) => (
                  <div key={i} onClick={() => { onNavigate(r.nav); setQuery(''); setOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>{r.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{r.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.sub}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', background: r.bg, color: r.color }}>{r.type}</span>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--text-3)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>Press Enter for all results</div>
        </div>
      )}
    </div>
  );
}

function NavButton({ n, page, setPage, badge }) {
  const active = page === n.id;
  return (
    <button onClick={() => setPage(n.id)}
      style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: active ? '600' : '500', color: active ? 'var(--green)' : 'var(--text-2)', background: active ? 'var(--green-light)' : 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', width: '100%', textAlign: 'left', marginBottom: '1px', transition: 'all 0.1s' }}>
      <span style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}>{n.icon}</span>
      <span style={{ flex: 1 }}>{n.label}</span>
      {badge > 0 && <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px', background: '#FEE2E2', color: '#C0392B' }}>{badge}</span>}
    </button>
  );
}

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const data = useData();
  const [page, setPage] = useState('dashboard');
  const [showMore, setShowMore] = useState(false);
  const [ideasResp, setIdeasResp] = useState('');
  const [convertIdea, setConvertIdea] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (authLoading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading…</div>;
  if (!user) return <LoginPage />;
  if (data.loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading data…</div>;

  const goIdeas = (resp) => { setIdeasResp(resp || ''); setPage('ideas'); };
  const handleConvertIdea = (idea) => { setConvertIdea(idea); setPage('pipeline'); };
  const goToPerson = (name) => { setSelectedPerson({ name }); setPage('people'); };

  const overdueBadge = React.useMemo(
    () => data.tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length,
    [data.tasks]
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="desktop-sidebar" style={{ width: '200px', flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--green)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#fff', fontWeight: '700', flexShrink: 0 }}>A</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>Avi's CRM</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Eminent Care Group</div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 8px 4px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#C0C5D0', textTransform: 'uppercase', letterSpacing: '.8px', padding: '0 8px', marginBottom: '4px' }}>Main</div>
          {NAV_MAIN.map(n => <NavButton key={n.id} n={n} page={page} setPage={setPage} badge={n.id === 'tasks' ? overdueBadge : 0} />)}
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#C0C5D0', textTransform: 'uppercase', letterSpacing: '.8px', padding: '10px 8px 4px' }}>People & Notes</div>
          {NAV_PEOPLE.map(n => <NavButton key={n.id} n={n} page={page} setPage={setPage} badge={0} />)}
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#C0C5D0', textTransform: 'uppercase', letterSpacing: '.8px', padding: '10px 8px 4px' }}>Archive</div>
          {NAV_OTHER.map(n => <NavButton key={n.id} n={n} page={page} setPage={setPage} badge={0} />)}
        </div>

        {/* User footer */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--green-text)', flexShrink: 0 }}>C</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>Chaim W.</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width: '100%', padding: '6px 10px', fontSize: '11px', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Sign out</button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Top header with search */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <SearchBar data={data} onNavigate={setPage} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('pipeline')}>+ Add</button>
          </div>
        </div>

        {/* Pages */}
        {page === 'dashboard' && <DashboardPage data={data} onNavigate={setPage} />}
        {page === 'pipeline' && <PipelinePage data={data} onGoIdeas={goIdeas} convertIdea={convertIdea} onConvertIdeaDone={() => setConvertIdea(null)} />}
        {page === 'tasks' && <TasksPage data={data} />}
        {page === 'calendar' && <CalendarPage data={data} />}
        {page === 'ideas' && <IdeasPage data={data} initialResp={ideasResp} onConvertIdea={handleConvertIdea} />}
        {page === 'notes' && <NotesPage data={data} onGoToPerson={goToPerson} />}
        {page === 'people' && <PeoplePage data={data} initialPerson={selectedPerson} />}
        {page === 'archive' && <ArchivePage data={data} />}

        {/* Mobile bottom nav */}
        <nav className="mobile-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', paddingBottom: 'var(--safe-bottom)', zIndex: 50 }}>
          {NAV_MOBILE.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setShowMore(false); }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 6px', fontSize: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: page === n.id ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font)' }}>
              <span>{n.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: page === n.id ? '600' : '400' }}>{n.label}</span>
            </button>
          ))}
          {/* Three dots */}
          <button onClick={() => setShowMore(p => !p)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 6px', fontSize: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: showMore || NAV_MORE.some(n => n.id === page) ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font)' }}>
            <span>•••</span>
            <span style={{ fontSize: '9px', fontWeight: '400' }}>More</span>
          </button>
        </nav>

        {/* More menu popup */}
        {showMore && (
          <div className="mobile-only" style={{ position: 'fixed', bottom: '56px', left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', zIndex: 49, padding: '8px' }}
            onClick={() => setShowMore(false)}>
            {NAV_MORE.map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); setShowMore(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', fontSize: '14px', background: page === n.id ? 'var(--green-light)' : 'transparent', color: page === n.id ? 'var(--green)' : 'var(--text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: page === n.id ? '600' : '400', marginBottom: '2px' }}>
                <span style={{ fontSize: '18px' }}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

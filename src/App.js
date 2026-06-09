import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import LoginPage from './pages/LoginPage';
import PipelinePage from './pages/PipelinePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import IdeasPage from './pages/IdeasPage';
import ArchivePage from './pages/ArchivePage';
import NotesPage from './pages/NotesPage';
import PeoplePage from './pages/PeoplePage';

const NAV = [
  { id: 'pipeline', label: 'Pipeline', icon: '⬡' },
  { id: 'tasks', label: 'Tasks', icon: '☑' },
  { id: 'calendar', label: 'Calendar', icon: '◫' },
  { id: 'ideas', label: 'Ideas', icon: '◉' },
  { id: 'notes', label: 'Memos', icon: '📝' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'archive', label: 'Completed', icon: '✓' },
];

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const data = useData();
  const [page, setPage] = useState('pipeline');
  const [ideasResp, setIdeasResp] = useState('');
  const [convertIdea, setConvertIdea] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (authLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading…</div>
  );
  if (!user) return <LoginPage />;
  if (data.loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '14px' }}>Loading data…</div>
  );

  const goIdeas = (resp) => { setIdeasResp(resp || ''); setPage('ideas'); };
  const handleConvertIdea = (idea) => { setConvertIdea(idea); setPage('pipeline'); };
  const goToPerson = (name) => { setSelectedPerson({ name }); setPage('people'); };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="desktop-sidebar" style={{ width: '200px', flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--green)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff', fontWeight: '600', marginBottom: '8px' }}>A</div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Avi's CRM</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{user.email}</div>
        </div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: page === n.id ? '600' : '400', color: page === n.id ? 'var(--green)' : 'var(--text-2)', background: page === n.id ? 'var(--green-light)' : 'transparent', borderLeft: page === n.id ? '3px solid var(--green)' : '3px solid transparent', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s', border: 'none', width: '100%', textAlign: 'left' }}>
            <span style={{ fontSize: '16px' }}>{n.icon}</span>{n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={signOut} style={{ margin: '0 12px 12px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Sign out</button>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {page === 'pipeline' && <PipelinePage data={data} onGoIdeas={goIdeas} convertIdea={convertIdea} onConvertIdeaDone={() => setConvertIdea(null)} />}
        {page === 'tasks' && <TasksPage data={data} />}
        {page === 'calendar' && <CalendarPage data={data} />}
        {page === 'ideas' && <IdeasPage data={data} initialResp={ideasResp} onConvertIdea={handleConvertIdea} />}
        {page === 'notes' && <NotesPage data={data} onGoToPerson={goToPerson} />}
        {page === 'people' && <PeoplePage data={data} initialPerson={selectedPerson} />}
        {page === 'archive' && <ArchivePage data={data} />}

        {/* Mobile bottom tab bar */}
        <nav className="mobile-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', paddingBottom: 'var(--safe-bottom)', zIndex: 50 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 0 6px', fontSize: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: page === n.id ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font)' }}>
              <span>{n.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: page === n.id ? '600' : '400' }}>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

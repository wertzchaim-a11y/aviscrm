import React from 'react';

function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

const FAC_COLORS = ['#4F46E5', '#1D9E75', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6'];

export default function DashboardPage({ data, onNavigate }) {
  const { facilities, items, tasks } = data;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().slice(0, 10);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const openTasks = tasks.filter(t => !t.done);
  const overdueTasks = openTasks.filter(t => isOverdue(t.due_date)).sort((a, b) => a.due_date?.localeCompare(b.due_date));
  const dueTodayTasks = openTasks.filter(t => t.due_date === today);
  const dueThisWeek = openTasks.filter(t => t.due_date && t.due_date > today && t.due_date <= weekEnd);
  const todayMeetings = tasks.filter(t => t.task_type === 'meeting' && t.due_date === today && !t.done).sort((a, b) => (a.meeting_time || '').localeCompare(b.meeting_time || ''));
  const activeProjects = items.filter(i => !i.completed);
  const priorityTasks = [...overdueTasks, ...dueTodayTasks].slice(0, 6);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 20px 0' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '3px' }}>{greeting}, Chaim 👋</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{dateStr} · {facilities.length} facilities</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { num: overdueTasks.length, label: 'Overdue', color: '#C0392B', bg: '#FEF0F0', onClick: () => onNavigate('tasks') },
            { num: dueThisWeek.length, label: 'Due this week', color: '#0C447C', bg: '#EBF3FD', onClick: () => onNavigate('tasks') },
            { num: todayMeetings.length, label: "Today's meetings", color: '#5B21B6', bg: '#F0EEFF', onClick: () => onNavigate('calendar') },
            { num: activeProjects.length, label: 'Active projects', color: '#1D9E75', bg: '#F0FBF7', onClick: () => onNavigate('pipeline') },
          ].map((s, i) => (
            <div key={i} onClick={s.onClick}
              style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '40'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Overdue & due today */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>⚠️ Overdue & due today</span>
              <span onClick={() => onNavigate('tasks')} style={{ fontSize: '11px', color: 'var(--green)', cursor: 'pointer' }}>All tasks →</span>
            </div>
            <div>
              {priorityTasks.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>🎉 All clear! Nothing overdue.</div>
              ) : priorityTasks.map(t => {
                const item = items.find(i => i.id === t.item_id);
                const fac = facilities.find(f => f.id === item?.facility_id);
                const ov = isOverdue(t.due_date);
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid #D0D5DD', flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</div>
                      <div style={{ fontSize: '10px', color: ov ? '#C0392B' : 'var(--text-3)', fontWeight: ov ? '600' : '400', marginTop: '1px' }}>
                        {ov ? `${Math.floor((new Date(today) - new Date(t.due_date)) / 86400000)} days overdue` : 'Due today'} · {fac?.name || 'Standalone'}
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', flexShrink: 0, background: t.priority === 'High' ? '#FEE2E2' : '#FEF3C7', color: t.priority === 'High' ? '#C0392B' : '#92400E' }}>{t.priority}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's meetings */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>📅 Today's meetings</span>
              <span onClick={() => onNavigate('calendar')} style={{ fontSize: '11px', color: 'var(--green)', cursor: 'pointer' }}>Calendar →</span>
            </div>
            <div>
              {todayMeetings.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>No meetings scheduled today.</div>
              ) : todayMeetings.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>📅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>
                      {t.meeting_time || 'All day'}{t.attendees ? ' · ' + t.attendees : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', background: '#FDEAEA', color: '#A93226', flexShrink: 0 }}>Meeting</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Facility overview */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Facility overview</span>
            <span onClick={() => onNavigate('pipeline')} style={{ fontSize: '11px', color: 'var(--green)', cursor: 'pointer' }}>Pipeline →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)' }}>
            {facilities.map((fac, i) => {
              const facItems = items.filter(it => it.facility_id === fac.id && !it.completed);
              const facTasks = tasks.filter(t => {
                const item = items.find(it => it.id === t.item_id);
                return item?.facility_id === fac.id && !t.done;
              });
              const facOverdue = facTasks.filter(t => isOverdue(t.due_date)).length;
              const facDone = tasks.filter(t => {
                const item = items.find(it => it.id === t.item_id);
                return item?.facility_id === fac.id && t.done;
              }).length;
              const facTotal = facTasks.length + facDone;
              const pct = facTotal > 0 ? Math.round(facDone / facTotal * 100) : 0;
              const color = FAC_COLORS[i % FAC_COLORS.length];
              return (
                <div key={fac.id} onClick={() => onNavigate('pipeline')}
                  style={{ padding: '12px 14px', background: '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>{fac.name}</span>
                    {facOverdue > 0
                      ? <span style={{ fontSize: '10px', color: '#C0392B', fontWeight: '600' }}>{facOverdue} overdue</span>
                      : <span style={{ fontSize: '10px', color: '#1D9E75', fontWeight: '500' }}>All clear ✓</span>}
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{facTasks.length} open task{facTasks.length !== 1 ? 's' : ''} · {facItems.length} project{facItems.length !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import ItemSheet from '../components/ItemSheet';

function fmt(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}/${y}`; }
function isOverdue(d) { return d && d < new Date().toISOString().slice(0, 10); }

const FAC_COLORS = ['#4F46E5', '#1D9E75', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6'];

function Popup({ title, onClose, onNavigate, navLabel, children }) {
  return (
    <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-center" style={{ padding: '20px', maxHeight: '82vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700' }}>{title}</h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '18px' }}>×</button>
        </div>
        {children}
        {onNavigate && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }} onClick={onNavigate}>
            {navLabel || 'Go →'}
          </button>
        )}
      </div>
    </div>
  );
}

function TaskRow({ t, items, facilities, today, toggleTask }) {
  const itm = items.find(i => i.id === t.item_id);
  const fac = facilities.find(f => f.id === itm?.facility_id);
  const ov = isOverdue(t.due_date);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div className={`cb ${t.done ? 'checked' : ''}`} style={{ flexShrink: 0, marginTop: '1px' }} onClick={() => toggleTask(t.id)}>
        {t.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.task_type === 'meeting' ? '📅 ' : ''}{t.name}</div>
        <div style={{ fontSize: '10px', color: ov ? '#C0392B' : 'var(--text-3)', fontWeight: ov ? '600' : '400', marginTop: '1px' }}>
          {ov ? `${Math.floor((new Date(today) - new Date(t.due_date)) / 86400000)}d overdue` : 'Due today'} · {fac?.name || 'Standalone'}
        </div>
      </div>
      {t.task_type !== 'meeting'
        ? <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', flexShrink: 0, background: t.priority === 'High' ? '#FEE2E2' : '#FEF3C7', color: t.priority === 'High' ? '#C0392B' : '#92400E' }}>{t.priority}</span>
        : <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', flexShrink: 0, background: '#FDEAEA', color: '#A93226' }}>Meeting</span>}
    </div>
  );
}

export default function DashboardPage({ data, onNavigate }) {
  const { facilities, items, tasks, steps, notes, ideas, toggleTask, updateItem, deleteItem, addTask, updateTask, deleteTask, addStep, toggleStep, deleteStep, addNote, deleteNote, addIdea, calcProgress } = data;

  const [popup, setPopup] = useState(null); // 'overdue' | 'week' | 'meetings' | 'facility' | 'priority'
  const [popupFacility, setPopupFacility] = useState(null);
  const [openItem, setOpenItem] = useState(null);

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
  const priorityItems = items.filter(i => i.is_priority && !i.completed);
  const priorityTasks = [...overdueTasks, ...dueTodayTasks].slice(0, 6);

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 20px 0' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '3px' }}>{greeting}, Chaim 👋</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{dateStr} · {facilities.length} facilities</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {[
            { num: overdueTasks.length, label: 'Overdue', color: '#C0392B', bg: '#FEF0F0', popup: 'overdue' },
            { num: dueThisWeek.length, label: 'Due this week', color: '#0C447C', bg: '#EBF3FD', popup: 'week' },
            { num: todayMeetings.length, label: "Today's meetings", color: '#5B21B6', bg: '#F0EEFF', popup: 'meetings' },
            { num: activeProjects.length, label: 'Active projects', color: '#1D9E75', bg: '#F0FBF7', popup: null, nav: 'pipeline' },
          ].map((s, i) => (
            <div key={i} onClick={() => s.popup ? setPopup(s.popup) : onNavigate(s.nav)}
              style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '40'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Priority projects */}
        <div onClick={() => setPopup('priority')} style={{ background: '#fff', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer', border: `1px solid ${priorityItems.length > 0 ? '#F59E0B60' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '10px' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B'}
          onMouseLeave={e => e.currentTarget.style.borderColor = priorityItems.length > 0 ? '#F59E0B60' : 'transparent'}>
          <span style={{ fontSize: '18px' }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Priority projects</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {priorityItems.length === 0 ? 'No projects marked as priority' : `${priorityItems.length} project${priorityItems.length !== 1 ? 's' : ''} marked as priority`}
            </div>
          </div>
          {priorityItems.length > 0 && <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 10px', borderRadius: '20px', fontWeight: '700' }}>{priorityItems.length}</span>}
          <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>›</span>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {/* Overdue & due today */}
          <div onClick={() => setPopup('overdue')} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>⚠️ Overdue & due today</span>
              <span style={{ fontSize: '11px', color: 'var(--green)' }}>View all ›</span>
            </div>
            <div style={{ padding: '4px 0 8px' }}>
              {priorityTasks.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>🎉 All clear!</div>
                : priorityTasks.slice(0, 3).map(t => {
                    const fac = facilities.find(f => f.id === items.find(i => i.id === t.item_id)?.facility_id);
                    const ov = isOverdue(t.due_date);
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div className={`cb ${t.done ? 'checked' : ''}`} style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); toggleTask(t.id); }}>{t.done && <span style={{ color: '#fff', fontSize: '9px' }}>✓</span>}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</div>
                          <div style={{ fontSize: '10px', color: ov ? '#C0392B' : 'var(--text-3)', fontWeight: ov ? '600' : '400' }}>{ov ? 'Overdue' : 'Due today'} · {fac?.name || 'Standalone'}</div>
                        </div>
                      </div>
                    );
                  })}
              {priorityTasks.length > 3 && <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--text-3)' }}>+{priorityTasks.length - 3} more…</div>}
            </div>
          </div>

          {/* Today's meetings */}
          <div onClick={() => setPopup('meetings')} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>📅 Today's meetings</span>
              <span style={{ fontSize: '11px', color: 'var(--green)' }}>View all ›</span>
            </div>
            <div>
              {todayMeetings.length === 0
                ? <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>No meetings today</div>
                : todayMeetings.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '16px' }}>📅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{t.meeting_time || 'All day'}{t.attendees ? ' · ' + t.attendees : ''}</div>
                      </div>
                    </div>
                  ))}
              {todayMeetings.length > 3 && <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--text-3)' }}>+{todayMeetings.length - 3} more…</div>}
            </div>
          </div>
        </div>

        {/* Facility overview */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Facility overview</span>
            <span onClick={() => onNavigate('pipeline')} style={{ fontSize: '11px', color: 'var(--green)', cursor: 'pointer' }}>Pipeline →</span>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', padding: '8px', gap: '8px' }}>
            {facilities.map((fac, i) => {
              const facItems = items.filter(it => it.facility_id === fac.id && !it.completed);
              const facTasks = tasks.filter(t => { const it = items.find(x => x.id === t.item_id); return it?.facility_id === fac.id && !t.done; });
              const facOverdue = facTasks.filter(t => isOverdue(t.due_date)).length;
              const facDone = tasks.filter(t => { const it = items.find(x => x.id === t.item_id); return it?.facility_id === fac.id && t.done; }).length;
              const pct = (facTasks.length + facDone) > 0 ? Math.round(facDone / (facTasks.length + facDone) * 100) : 0;
              const color = FAC_COLORS[i % FAC_COLORS.length];
              return (
                <div key={fac.id} onClick={() => { setPopupFacility(fac); setPopup('facility'); }}
                  style={{ flexShrink: 0, width: '160px', scrollSnapAlign: 'start', padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>{fac.name}</span>
                  </div>
                  <div style={{ fontSize: '10px', marginBottom: '6px', fontWeight: '600', color: facOverdue > 0 ? '#C0392B' : '#1D9E75' }}>
                    {facOverdue > 0 ? `${facOverdue} overdue` : 'All clear ✓'}
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{facTasks.length} task{facTasks.length !== 1 ? 's' : ''} · {facItems.length} project{facItems.length !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── POPUPS ── */}

      {/* Overdue popup */}
      {popup === 'overdue' && (
        <Popup title="⚠️ Overdue & due today" onClose={() => setPopup(null)} onNavigate={() => { setPopup(null); onNavigate('tasks'); }} navLabel="Go to Tasks →">
          {priorityTasks.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '13px' }}>🎉 Nothing overdue!</div>
            : priorityTasks.map(t => <TaskRow key={t.id} t={t} items={items} facilities={facilities} today={today} toggleTask={toggleTask} />)}
        </Popup>
      )}

      {/* Due this week popup */}
      {popup === 'week' && (
        <Popup title="📆 Due this week" onClose={() => setPopup(null)} onNavigate={() => { setPopup(null); onNavigate('tasks'); }} navLabel="Go to Tasks →">
          {dueThisWeek.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '13px' }}>Nothing due this week!</div>
            : dueThisWeek.map(t => {
                const itm = items.find(i => i.id === t.item_id);
                const fac = facilities.find(f => f.id === itm?.facility_id);
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className={`cb ${t.done ? 'checked' : ''}`} style={{ flexShrink: 0, marginTop: '1px' }} onClick={() => toggleTask(t.id)}>{t.done && <span style={{ color: '#fff', fontSize: '9px' }}>✓</span>}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{t.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>Due {fmt(t.due_date)} · {fac?.name || 'Standalone'}</div>
                    </div>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', flexShrink: 0, background: t.priority === 'High' ? '#FEE2E2' : '#FEF3C7', color: t.priority === 'High' ? '#C0392B' : '#92400E' }}>{t.priority}</span>
                  </div>
                );
              })}
        </Popup>
      )}

      {/* Meetings popup */}
      {popup === 'meetings' && (
        <Popup title="📅 Today's meetings" onClose={() => setPopup(null)} onNavigate={() => { setPopup(null); onNavigate('calendar'); }} navLabel="Go to Calendar →">
          {todayMeetings.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '13px' }}>No meetings today!</div>
            : todayMeetings.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '18px' }}>📅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{t.meeting_time || 'All day'}{t.attendees ? ' · ' + t.attendees : ''}</div>
                    {t.notes && <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px', lineHeight: '1.5' }}>{t.notes}</div>}
                  </div>
                </div>
              ))}
        </Popup>
      )}

      {/* Priority projects popup */}
      {popup === 'priority' && (
        <Popup title="⭐ Priority projects" onClose={() => setPopup(null)} onNavigate={() => { setPopup(null); onNavigate('pipeline'); }} navLabel="Go to Pipeline →">
          {priorityItems.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⭐</div>
                No priority projects yet.<br />
                <span style={{ fontSize: '11px' }}>Star a project in the Pipeline to mark it as priority.</span>
              </div>
            : priorityItems.map(item => {
                const fac = facilities.find(f => f.id === item.facility_id);
                const prog = calcProgress(item);
                const ov = isOverdue(item.due_date);
                const itemTasks = tasks.filter(t => t.item_id === item.id && !t.done);
                const overdueCount = itemTasks.filter(t => isOverdue(t.due_date)).length;
                return (
                  <div key={item.id} onClick={() => { setOpenItem(item.id); setPopup(null); }}
                    style={{ padding: '12px 14px', marginBottom: '10px', borderRadius: '10px', border: '2px solid #F59E0B', background: '#FFFDF5', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFF8E0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFDF5'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '3px' }}>⭐ {item.name}</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {fac && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: '#EBF3FD', color: '#0C447C', fontWeight: '600' }}>{fac.name}</span>}
                          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: '#F0EEFF', color: '#5B21B6', fontWeight: '600' }}>{item.responsibility}</span>
                          {item.due_date && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: ov ? '#FEE2E2' : '#F5F5F5', color: ov ? '#C0392B' : '#666', fontWeight: '600' }}>{ov ? '⚠ Overdue' : '📅 ' + fmt(item.due_date)}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#92400E', fontWeight: '700' }}>{prog}%</span>
                    </div>
                    {overdueCount > 0 && <div style={{ fontSize: '11px', color: '#C0392B', fontWeight: '600', marginBottom: '5px' }}>⚠ {overdueCount} task{overdueCount !== 1 ? 's' : ''} overdue</div>}
                    <div style={{ height: '4px', background: '#F0F0F0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${prog}%`, background: prog === 100 ? '#1D9E75' : '#F59E0B', borderRadius: '2px' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{itemTasks.length} open task{itemTasks.length !== 1 ? 's' : ''} · Tap to open</div>
                  </div>
                );
              })}
        </Popup>
      )}

      {/* Facility popup */}
      {popup === 'facility' && popupFacility && (
        <Popup title={popupFacility.name} onClose={() => { setPopup(null); setPopupFacility(null); }} onNavigate={() => { setPopup(null); setPopupFacility(null); onNavigate('pipeline'); }} navLabel="Go to Pipeline →">
          {(() => {
            const facItems = items.filter(i => i.facility_id === popupFacility.id && !i.completed);
            const facTasks = tasks.filter(t => { const i = items.find(x => x.id === t.item_id); return i?.facility_id === popupFacility.id && !t.done; });
            const overdueT = facTasks.filter(t => isOverdue(t.due_date));
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { num: facItems.length, label: 'Active projects', color: '#0C447C' },
                    { num: facTasks.length, label: 'Open tasks', color: '#5B21B6' },
                    { num: overdueT.length, label: 'Overdue tasks', color: '#C0392B' },
                    { num: facItems.filter(i => i.is_priority).length, label: 'Priority', color: '#F59E0B' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.num}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Projects</div>
                {facItems.length === 0
                  ? <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '8px 0' }}>No active projects</div>
                  : facItems.map(item => {
                      const prog = calcProgress(item);
                      const ov = isOverdue(item.due_date);
                      return (
                        <div key={item.id} onClick={() => { setOpenItem(item.id); setPopup(null); setPopupFacility(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                          {item.is_priority && <span style={{ fontSize: '12px' }}>⭐</span>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600' }}>{item.name}</div>
                            <div style={{ fontSize: '10px', color: ov ? '#C0392B' : 'var(--text-3)', fontWeight: ov ? '600' : '400' }}>
                              {ov ? '⚠ Overdue · ' : item.due_date ? 'Due ' + fmt(item.due_date) + ' · ' : ''}{item.responsibility}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '600' }}>{prog}%</span>
                          <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>›</span>
                        </div>
                      );
                    })}
                {overdueT.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Overdue tasks</div>
                    {overdueT.slice(0, 5).map(t => <TaskRow key={t.id} t={t} items={items} facilities={facilities} today={today} toggleTask={toggleTask} />)}
                  </div>
                )}
              </div>
            );
          })()}
        </Popup>
      )}

      {/* ItemSheet */}
      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas}
          onClose={() => setOpenItem(null)}
          onUpdateItem={updateItem} onDeleteItem={deleteItem}
          onAddStep={addStep} onToggleStep={toggleStep} onDeleteStep={deleteStep}
          onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
          onAddNote={addNote} onDeleteNote={deleteNote}
          onGoIdeas={() => setOpenItem(null)}
          calcProgress={calcProgress}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import ItemSheet from '../components/ItemSheet';
import OutlookConnect from '../components/OutlookConnect';
import { getValidAccessToken, isOutlookConnected, syncOutlookToSupabase, shouldSync } from '../lib/outlookSync';
 
const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }
function fmtTime(t) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`; }
 
const RECUR_OPTS = ['never', 'daily', 'weekly', 'biweekly', 'monthly'];
const RECUR_LABEL = { never: 'Never', daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
 
function RecurPicker({ value, days, onChange, onDaysChange }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>🔁 Repeat</label>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {RECUR_OPTS.map(o => (
          <button key={o} onClick={() => onChange(o)}
            style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', border: '1px solid var(--border)', background: value === o ? 'var(--text)' : 'var(--surface)', color: value === o ? '#fff' : 'var(--text-2)' }}>
            {RECUR_LABEL[o]}
          </button>
        ))}
      </div>
      {(value === 'weekly' || value === 'biweekly') && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {DOW_LABELS.map((d, i) => {
            const sel = days ? days.split(',').includes(String(i)) : false;
            return <button key={i} onClick={() => { const cur = days ? days.split(',').filter(Boolean) : []; const next = sel ? cur.filter(x => x !== String(i)) : [...cur, String(i)]; onDaysChange(next.join(',')); }}
              style={{ width: '28px', height: '28px', borderRadius: '50%', fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', border: '1px solid var(--border)', background: sel ? '#1D9E75' : 'var(--surface)', color: sel ? '#fff' : 'var(--text-2)' }}>{d}</button>;
          })}
        </div>
      )}
      {value !== 'never' && <div style={{ background: '#F0FBF7', border: '1px solid #C8EDD8', borderRadius: '8px', padding: '7px 10px', fontSize: '11px', color: '#2D7A5A' }}>🔁 Repeats {RECUR_LABEL[value].toLowerCase()}</div>}
    </div>
  );
}
 
export default function CalendarPage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, outlookDbEvents, addItem, addTask, addStep, toggleStep, deleteStep, updateItem, deleteItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, addIdea, calcProgress, refreshOutlookEvents } = data;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filters, setFilters] = useState({ task: true, event: true, project: true, meeting: true });
  const [openItem, setOpenItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState({});
  const [selectedOutlook, setSelectedOutlook] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addType, setAddType] = useState('task');
  const [itemForm, setItemForm] = useState({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', event_time: '', assigned_to: '' });
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '', recur_type: 'never', recur_days: '' });
  const [outlookConnected, setOutlookConnected] = useState(isOutlookConnected());
  const [syncing, setSyncing] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ name: '', due_date: '', meeting_time: '', assigned_to: '', attendees: '', notes: '', item_id: '', recur_type: 'never', recur_days: '' });
  const [activeTab, setActiveTab] = useState('details');
  const [quickSteps, setQuickSteps] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [quickIdeas, setQuickIdeas] = useState([]);
  const [stepInput, setStepInput] = useState('');
  const [taskInput, setTaskInput] = useState({ name: '', due_date: '', meeting_time: '', priority: 'Medium', notes: '', attendees: '', task_type: 'task', recur_type: 'never', recur_days: '' });
  const [noteInput, setNoteInput] = useState('');
  const [ideaInput, setIdeaInput] = useState({ title: '', body: '' });
 
  const todayStr = now.toISOString().slice(0, 10);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const monthStr = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
 
  useEffect(() => {
    const doSync = async () => {
      if (!outlookConnected || !shouldSync()) return;
      const token = await getValidAccessToken();
      if (!token) { setOutlookConnected(false); return; }
      setSyncing(true);
      await syncOutlookToSupabase(token);
      await refreshOutlookEvents();
      setSyncing(false);
    };
    doSync();
  }, []);
 
  const resetAdd = () => {
    setShowAdd(false); setActiveTab('details'); setAddType('task');
    setQuickSteps([]); setQuickTasks([]); setQuickNotes([]); setQuickIdeas([]);
    setStepInput(''); setTaskInput({ name: '', due_date: '', meeting_time: '', priority: 'Medium', notes: '', attendees: '', task_type: 'task', recur_type: 'never', recur_days: '' });
    setNoteInput(''); setIdeaInput({ title: '', body: '' });
    setMeetingForm({ name: '', due_date: '', meeting_time: '', assigned_to: '', attendees: '', notes: '', item_id: '', recur_type: 'never', recur_days: '' });
    setTaskForm({ name: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '', recur_type: 'never', recur_days: '' });
    setItemForm({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', event_time: '', assigned_to: '' });
  };
 
  const toggleFilter = (key) => setFilters(p => ({ ...p, [key]: !p[key] }));
  const move = (dir) => { let m = month + dir, y = year; if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; } setMonth(m); setYear(y); };
 
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (addType === 'task') {
        if (!taskForm.name.trim()) return;
        await addTask({ name: taskForm.name.trim(), due_date: taskForm.due_date || null, assigned_to: taskForm.assigned_to || null, priority: taskForm.priority || 'Medium', notes: taskForm.notes || null, item_id: taskForm.item_id || null, step_id: null, done: false, task_type: 'task', recur_type: taskForm.recur_type || 'never', recur_days: taskForm.recur_days || null });
      } else if (addType === 'meeting') {
        if (!meetingForm.name.trim()) return;
        await addTask({ name: meetingForm.name.trim(), due_date: meetingForm.due_date || null, meeting_time: meetingForm.meeting_time || null, assigned_to: meetingForm.assigned_to || null, attendees: meetingForm.attendees || null, notes: meetingForm.notes || null, item_id: meetingForm.item_id || null, step_id: null, done: false, task_type: 'meeting', priority: 'Medium', recur_type: meetingForm.recur_type || 'never', recur_days: meetingForm.recur_days || null });
      } else {
        if (!itemForm.name.trim() || !itemForm.facility_id) return;
        const newItem = await addItem({
          name: itemForm.name.trim(),
          type: addType,
          facility_id: itemForm.facility_id,
          responsibility: itemForm.responsibility,
          due_date: itemForm.due_date || null,
          event_time: itemForm.event_time || null,
          assigned_to: itemForm.assigned_to || null,
        });
        if (newItem) {
          await Promise.all([
            ...quickSteps.map(s => addStep({ item_id: newItem.id, name: s })),
            ...quickTasks.map(t => addTask({ item_id: newItem.id, name: t.name, due_date: t.due_date || null, priority: t.priority || 'Medium', notes: t.notes || null, step_id: null, done: false, task_type: t.task_type || 'task', meeting_time: t.meeting_time || null, attendees: t.attendees || null, recur_type: t.recur_type || 'never', recur_days: t.recur_days || null })),
            ...quickNotes.map(n => addNote({ item_id: newItem.id, text: n })),
            ...quickIdeas.map(id => addIdea({ title: id.title, responsibility: itemForm.responsibility, body: id.body || null, item_id: newItem.id })),
          ]);
        }
      }
      resetAdd();
    } finally {
      setIsSaving(false);
    }
  };
 
  const handleSaveTaskEdit = async () => {
    await updateTask(selectedTask.id, { ...editTaskForm, due_date: editTaskForm.due_date || null, assigned_to: editTaskForm.assigned_to || null, notes: editTaskForm.notes || null, recur_type: editTaskForm.recur_type || 'never', recur_days: editTaskForm.recur_days || null, meeting_time: editTaskForm.meeting_time || null, attendees: editTaskForm.attendees || null });
    setSelectedTask(p => ({ ...p, ...editTaskForm }));
    setEditingTask(false);
  };
 
  const convertOutlookToProject = (ev) => {
    setItemForm({ name: ev.subject || '', type: 'meeting', facility_id: '', responsibility: 'Marketing', due_date: ev.start_date || '', event_time: ev.start_time || '', assigned_to: '' });
    setAddType('project');
    setActiveTab('details');
    setSelectedOutlook(null);
    setSelectedDate(null);
    setShowAdd(true);
  };
 
  const evMap = {};
  const addEv = (date, entry) => { if (!date) return; (evMap[date] = evMap[date] || []).push(entry); };
  items.forEach(item => {
    if (filters.project && item.type === 'project' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'proj', id: item.id });
    if (filters.event && item.type === 'event' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'evt', id: item.id });
    if (filters.meeting && item.type === 'meeting' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'mtg_item', id: item.id });
  });
  if (filters.task) tasks.filter(t => t.due_date && t.task_type !== 'meeting').forEach(t => {
    const item = items.find(i => i.id === t.item_id);
    addEv(t.due_date, { label: t.name, cls: 'tsk', id: item?.id, task_id: t.id, task: t });
  });
  if (filters.meeting) tasks.filter(t => t.due_date && t.task_type === 'meeting').forEach(t => {
    const item = items.find(i => i.id === t.item_id);
    addEv(t.due_date, { label: t.name, cls: 'mtg', id: item?.id, task_id: t.id, task: t });
  });
  // Always show Outlook events from DB — connection only needed to sync new ones
  outlookDbEvents.forEach(ev => {
      const date = ev.start_date;
      const accepted = ev.response_status === 'accepted' || ev.response_status === 'organizer';
      const isMtg = ev.has_attendees || ev.is_online_meeting;
      const cls = isMtg ? (accepted ? 'outlook_mtg_yes' : 'outlook_mtg_maybe') : 'outlook_evt';
      if (isMtg && !filters.meeting) return;
      if (!isMtg && !filters.event) return;
      if (date) addEv(date, { label: ev.subject, cls, id: null, outlookEv: ev });
    });
 
  const clsColor = {
    proj: { background: '#EEEDFE', color: '#3C3489' }, evt: { background: '#F0EEFF', color: '#5B21B6' },
    tsk: { background: '#EBF3FD', color: '#0C447C' }, mtg: { background: '#FDEAEA', color: '#A93226' },
    mtg_item: { background: '#FDEAEA', color: '#A93226' }, outlook_mtg_yes: { background: '#FDEAEA', color: '#A93226' },
    outlook_mtg_maybe: { background: '#FEF3F3', color: '#E07070' }, outlook_evt: { background: '#F0EEFF', color: '#5B21B6' },
  };
  const clsBorder = { proj: '#4F46E5', evt: '#7C3AED', tsk: '#0C447C', mtg: '#C0392B', mtg_item: '#C0392B', outlook_mtg_yes: '#C0392B', outlook_mtg_maybe: '#E07070', outlook_evt: '#7C3AED' };
  const clsIcon = { tsk: '☑ ', mtg: '📅 ', mtg_item: '📅 ', proj: '◆ ', evt: '★ ', outlook_mtg_yes: '📅 ', outlook_mtg_maybe: '📅 ', outlook_evt: '★ ' };
 
  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);
 
  const handleEvClick = (ev) => {
    if (ev.outlookEv) { setSelectedOutlook(ev.outlookEv); setSelectedDate(null); return; }
    if (ev.cls === 'tsk' || ev.cls === 'mtg') {
      if (ev.task) { setSelectedTask(ev.task); setEditingTask(false); setSelectedDate(null); }
      else if (ev.id) { setOpenItem(ev.id); setSelectedDate(null); }
      return;
    }
    if (ev.id) { setOpenItem(ev.id); setSelectedDate(null); }
  };
 
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Calendar</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <OutlookConnect onConnected={async () => { setOutlookConnected(true); setSyncing(true); const token = await getValidAccessToken(); if (token) { await syncOutlookToSupabase(token); await refreshOutlookEvents(); } setSyncing(false); }} />
            {outlookConnected && (
              <button className="btn btn-sm" style={{ fontSize: '11px' }} onClick={async () => { setSyncing(true); const token = await getValidAccessToken(); if (token) { await syncOutlookToSupabase(token); await refreshOutlookEvents(); } setSyncing(false); }}>
                {syncing ? '🔄 Syncing…' : '🔄 Sync'}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[['task','☑ Tasks','#EBF3FD','#0C447C'],['meeting','📅 Meetings','#FDEAEA','#A93226'],['event','★ Events','#F0EEFF','#5B21B6'],['project','◆ Projects','#EEEDFE','#3C3489']].map(([key, label, bg, col]) => (
            <button key={key} onClick={() => toggleFilter(key)}
              style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontFamily: 'var(--font)', fontWeight: '600', cursor: 'pointer', background: filters[key] ? bg : 'var(--surface)', color: filters[key] ? col : 'var(--text-3)', border: `1px solid ${filters[key] ? col + '60' : 'var(--border)'}` }}>
              {label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn-icon" onClick={() => move(-1)}>‹</button>
            <span style={{ fontWeight: '600', fontSize: '14px', minWidth: '110px', textAlign: 'center' }}>{monthStr}</span>
            <button className="btn-icon" onClick={() => move(1)}>›</button>
          </div>
        </div>
      </div>
 
      {/* Calendar grid */}
      <div style={{ padding: '0 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '2px' }}>
          {DOW_LABELS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-3)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '.4px' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} style={{ minHeight: '100px', background: 'var(--bg)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '5px' }}>
              <div style={{ fontSize: '11px', color: 'var(--border-md)' }}>{getDaysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1) - firstDay + i + 1}</div>
            </div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const evs = evMap[ds] || [];
            const isToday = ds === todayStr;
            return (
              <div key={d} onClick={() => setSelectedDate(ds)}
                style={{ minHeight: '100px', background: 'var(--surface)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '5px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: isToday ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', fontWeight: isToday ? '700' : '500', color: isToday ? '#fff' : 'var(--text-2)' }}>{d}</span>
                </div>
                {evs.slice(0, 3).map((ev, ei) => (
                  <div key={ei}
                    onClick={e => { e.stopPropagation(); setSelectedDate(ds); }}
                    style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '0 5px 5px 0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', opacity: ev.task?.done ? 0.45 : 1, textDecoration: ev.task?.done ? 'line-through' : 'none', borderLeft: `3px solid ${clsBorder[ev.cls] || '#aaa'}`, cursor: 'pointer', ...clsColor[ev.cls] }}>
                    {clsIcon[ev.cls]}{ev.label}
                  </div>
                ))}
                {evs.length > 3 && <div style={{ fontSize: '10px', color: 'var(--text-3)', paddingLeft: '4px', fontWeight: '500' }}>+{evs.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Add modal */}
      {showAdd && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && resetAdd()}>
          <div className="sheet-center" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Add to calendar</h2>
              <button className="btn-icon" onClick={resetAdd} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '14px' }}>
              {[['task','Task'],['meeting','📅 Meeting'],['project','Project'],['event','Event']].map(([t, l]) => (
                <button key={t} onClick={() => { setAddType(t); if (t === 'project' || t === 'event') setItemForm(p => ({ ...p, type: t })); }}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: addType === t ? 'var(--text)' : 'var(--surface)', color: addType === t ? '#fff' : 'var(--text-2)' }}>
                  {l}
                </button>
              ))}
            </div>
            {addType === 'task' && (
              <>
                <div className="form-row">
                  <div className="form-group full"><label>Task name</label><input value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                  <div className="form-group"><label>Due date</label><input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                  <div className="form-group"><label>Assigned to</label><input value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  <div className="form-group"><label>Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="form-group full"><label>Link to project (optional)</label>
                    <select value={taskForm.item_id} onChange={e => setTaskForm(p => ({ ...p, item_id: e.target.value }))}>
                      <option value="">— Standalone —</option>
                      {items.map(i => { const fac = facilities.find(f => f.id === i.facility_id); return <option key={i.id} value={i.id}>{fac ? fac.name + ' · ' : ''}{i.name}</option>; })}
                    </select>
                  </div>
                  <div className="form-group full"><label>Notes</label><textarea value={taskForm.notes} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <RecurPicker value={taskForm.recur_type} days={taskForm.recur_days} onChange={v => setTaskForm(p => ({ ...p, recur_type: v }))} onDaysChange={v => setTaskForm(p => ({ ...p, recur_days: v }))} />
              </>
            )}
            {addType === 'meeting' && (
              <>
                <div className="form-row">
                  <div className="form-group full"><label>Meeting name</label><input value={meetingForm.name} onChange={e => setMeetingForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                  <div className="form-group"><label>Date</label><input type="date" value={meetingForm.due_date} onChange={e => setMeetingForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                  <div className="form-group"><label>Time</label><input type="time" value={meetingForm.meeting_time} onChange={e => setMeetingForm(p => ({ ...p, meeting_time: e.target.value }))} /></div>
                  <div className="form-group"><label>Assigned to</label><input value={meetingForm.assigned_to} onChange={e => setMeetingForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  <div className="form-group full"><label>Attendees (optional)</label><input value={meetingForm.attendees} onChange={e => setMeetingForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Names separated by commas…" /></div>
                  <div className="form-group full"><label>Link to project (optional)</label>
                    <select value={meetingForm.item_id} onChange={e => setMeetingForm(p => ({ ...p, item_id: e.target.value }))}>
                      <option value="">— Standalone —</option>
                      {items.map(i => { const fac = facilities.find(f => f.id === i.facility_id); return <option key={i.id} value={i.id}>{fac ? fac.name + ' · ' : ''}{i.name}</option>; })}
                    </select>
                  </div>
                  <div className="form-group full"><label>Notes</label><textarea value={meetingForm.notes} onChange={e => setMeetingForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <RecurPicker value={meetingForm.recur_type} days={meetingForm.recur_days} onChange={v => setMeetingForm(p => ({ ...p, recur_type: v }))} onDaysChange={v => setMeetingForm(p => ({ ...p, recur_days: v }))} />
              </>
            )}
            {(addType === 'project' || addType === 'event') && (
              <div>
                <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '14px' }}>
                  {[['details','Details'],['steps','Steps'],['tasks','Tasks'],['notes','Notes'],['ideas','Ideas']].map(([t, l]) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', fontFamily: 'var(--font)', fontWeight: activeTab === t ? '600' : '400', cursor: 'pointer', background: activeTab === t ? 'var(--text)' : 'var(--surface)', color: activeTab === t ? '#fff' : 'var(--text-2)', border: activeTab !== t ? '1px solid var(--border)' : 'none', whiteSpace: 'nowrap' }}>
                      {l}{t === 'steps' && quickSteps.length ? ` (${quickSteps.length})` : ''}{t === 'tasks' && quickTasks.length ? ` (${quickTasks.length})` : ''}{t === 'notes' && quickNotes.length ? ` (${quickNotes.length})` : ''}{t === 'ideas' && quickIdeas.length ? ` (${quickIdeas.length})` : ''}
                    </button>
                  ))}
                </div>
                {activeTab === 'details' && (
                  <div className="form-row">
                    <div className="form-group full"><label>Name *</label><input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                    <div className="form-group"><label>Facility *</label>
                      <select value={itemForm.facility_id} onChange={e => setItemForm(p => ({ ...p, facility_id: e.target.value }))}>
                        <option value="">Select…</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Responsibility</label>
                      <select value={itemForm.responsibility} onChange={e => setItemForm(p => ({ ...p, responsibility: e.target.value }))}>
                        {RESP_COLS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Due date</label><input type="date" value={itemForm.due_date} onChange={e => setItemForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                    {addType === 'event' && <div className="form-group"><label>Time (optional)</label><input type="time" value={itemForm.event_time || ''} onChange={e => setItemForm(p => ({ ...p, event_time: e.target.value }))} /></div>}
                    <div className="form-group"><label>Assigned to</label><input value={itemForm.assigned_to} onChange={e => setItemForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  </div>
                )}
                {activeTab === 'steps' && (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input value={stepInput} onChange={e => setStepInput(e.target.value)} placeholder="Step name…" onKeyDown={e => { if (e.key === 'Enter' && stepInput.trim()) { setQuickSteps(p => [...p, stepInput.trim()]); setStepInput(''); }}} autoFocus />
                      <button className="btn btn-sm btn-primary" onClick={() => { if (stepInput.trim()) { setQuickSteps(p => [...p, stepInput.trim()]); setStepInput(''); }}}>Add</button>
                    </div>
                    {quickSteps.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No steps yet.</div> : quickSteps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                        <span style={{ flex: 1 }}>{i + 1}. {s}</span>
                        <button className="btn-icon" style={{ fontSize: '12px' }} onClick={() => setQuickSteps(p => p.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'tasks' && (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      {[['task','☑ Task'],['meeting','📅 Meeting']].map(([t, l]) => (
                        <button key={t} onClick={() => setTaskInput(p => ({ ...p, task_type: t }))}
                          style={{ flex: 1, padding: '5px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: (taskInput.task_type || 'task') === t ? 'var(--text)' : 'var(--surface)', color: (taskInput.task_type || 'task') === t ? '#fff' : 'var(--text-2)' }}>{l}</button>
                      ))}
                    </div>
                    <div className="form-row" style={{ marginBottom: '8px' }}>
                      <div className="form-group full"><label>{(taskInput.task_type || 'task') === 'meeting' ? 'Meeting name' : 'Task name'}</label><input value={taskInput.name} onChange={e => setTaskInput(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                      <div className="form-group"><label>Due date</label><input type="date" value={taskInput.due_date} onChange={e => setTaskInput(p => ({ ...p, due_date: e.target.value }))} /></div>
                      {(taskInput.task_type || 'task') === 'meeting' && <div className="form-group"><label>Time</label><input type="time" value={taskInput.meeting_time || ''} onChange={e => setTaskInput(p => ({ ...p, meeting_time: e.target.value }))} /></div>}
                      {(taskInput.task_type || 'task') !== 'meeting' && <div className="form-group"><label>Priority</label>
                        <select value={taskInput.priority} onChange={e => setTaskInput(p => ({ ...p, priority: e.target.value }))}>
                          <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </div>}
                      {(taskInput.task_type || 'task') === 'meeting' && <div className="form-group full"><label>Attendees</label><input value={taskInput.attendees || ''} onChange={e => setTaskInput(p => ({ ...p, attendees: e.target.value }))} placeholder="Names separated by commas…" /></div>}
                      <div className="form-group full"><label>Notes (optional)</label><textarea value={taskInput.notes || ''} onChange={e => setTaskInput(p => ({ ...p, notes: e.target.value }))} placeholder="Any extra details…" /></div>
                    </div>
                    <RecurPicker value={taskInput.recur_type || 'never'} days={taskInput.recur_days || ''} onChange={v => setTaskInput(p => ({ ...p, recur_type: v }))} onDaysChange={v => setTaskInput(p => ({ ...p, recur_days: v }))} />
                    <button className="btn btn-sm btn-primary" style={{ marginTop: '8px', marginBottom: '10px' }} onClick={() => { if (taskInput.name.trim()) { setQuickTasks(p => [...p, { ...taskInput }]); setTaskInput({ name: '', due_date: '', meeting_time: '', priority: 'Medium', notes: '', attendees: '', task_type: 'task', recur_type: 'never', recur_days: '' }); }}}>Add {(taskInput.task_type || 'task') === 'meeting' ? 'meeting' : 'task'}</button>
                    {quickTasks.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No tasks yet.</div> : quickTasks.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                        <span style={{ flex: 1 }}>{t.task_type === 'meeting' ? '📅 ' : ''}{t.name}</span>
                        {t.recur_type && t.recur_type !== 'never' && <span style={{ fontSize: '10px', background: '#F0FBF7', color: '#1D9E75', padding: '1px 6px', borderRadius: '8px', fontWeight: '600' }}>🔁</span>}
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{t.task_type !== 'meeting' ? t.priority : ''}</span>
                        <button className="btn-icon" style={{ fontSize: '12px' }} onClick={() => setQuickTasks(p => p.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'notes' && (
                  <div>
                    <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Write a note…" style={{ minHeight: '80px', width: '100%' }} autoFocus />
                    <button className="btn btn-sm btn-primary" style={{ marginTop: '8px', marginBottom: '10px' }} onClick={() => { if (noteInput.trim()) { setQuickNotes(p => [...p, noteInput.trim()]); setNoteInput(''); }}}>Add note</button>
                    {quickNotes.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No notes yet.</div> : quickNotes.map((n, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                        <span style={{ flex: 1 }}>{n}</span>
                        <button className="btn-icon" style={{ fontSize: '12px' }} onClick={() => setQuickNotes(p => p.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'ideas' && (
                  <div>
                    <div className="form-row" style={{ marginBottom: '8px' }}>
                      <div className="form-group full"><label>Idea title</label><input value={ideaInput.title} onChange={e => setIdeaInput(p => ({ ...p, title: e.target.value }))} autoFocus /></div>
                      <div className="form-group full"><label>Details</label><textarea value={ideaInput.body} onChange={e => setIdeaInput(p => ({ ...p, body: e.target.value }))} /></div>
                    </div>
                    <button className="btn btn-sm btn-primary" style={{ marginBottom: '10px' }} onClick={() => { if (ideaInput.title.trim()) { setQuickIdeas(p => [...p, { ...ideaInput }]); setIdeaInput({ title: '', body: '' }); }}}>Add idea</button>
                    {quickIdeas.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No ideas yet.</div> : quickIdeas.map((id, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                        <span>💡</span><span style={{ flex: 1 }}>{id.title}</span>
                        <button className="btn-icon" style={{ fontSize: '12px' }} onClick={() => setQuickIdeas(p => p.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '14px' }}>
              <button className="btn btn-sm" onClick={resetAdd}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={isSaving} style={{ opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving…' : `Save ${addType === 'meeting' ? 'meeting' : addType === 'task' ? 'task' : addType}`}</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ItemSheet for projects/events/meeting items */}
      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas} facilityNotes={data.facilityNotes || []}
          onClose={() => setOpenItem(null)}
          onUpdateItem={updateItem} onDeleteItem={deleteItem} onAddStep={addStep} onToggleStep={toggleStep} onDeleteStep={deleteStep}
          onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
          onAddNote={addNote} onDeleteNote={deleteNote}
          onGoIdeas={() => setOpenItem(null)}
          calcProgress={calcProgress}
        />
      )}
 
      {/* Date popup — 3 columns */}
      {selectedDate && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setSelectedDate(null)}>
          <div className="sheet-center" style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <button className="btn-icon" onClick={() => setSelectedDate(null)} style={{ fontSize: '18px' }}>×</button>
            </div>
            {(() => {
              const dayEvs = evMap[selectedDate] || [];
              if (dayEvs.length === 0) return (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '13px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                  Nothing scheduled for this day.
                </div>
              );
              const evTasks = dayEvs.filter(ev => ev.cls === 'tsk');
              const evMeetings = dayEvs.filter(ev => ev.cls === 'mtg' || ev.cls === 'mtg_item' || ev.cls === 'outlook_mtg_yes' || ev.cls === 'outlook_mtg_maybe');
              const evEvents = dayEvs.filter(ev => ev.cls === 'evt' || ev.cls === 'proj' || ev.cls === 'outlook_evt');
 
              const renderEv = (ev, i) => {
                const item = items.find(it => it.id === ev.id);
                const fac = facilities.find(f => f.id === item?.facility_id);
                const isOutlook = !!ev.outlookEv;
                const isTask = ev.cls === 'tsk' || ev.cls === 'mtg';
                const isTentative = ev.cls === 'outlook_mtg_maybe';
                return (
                  <div key={i} className="card" style={{ padding: '8px 10px', marginBottom: '6px', cursor: 'pointer', fontSize: '12px', borderLeft: `3px solid ${clsBorder[ev.cls] || '#aaa'}`, opacity: isTentative ? 0.75 : 1 }}
                    onClick={() => handleEvClick(ev)}>
                    {isTask && (
                      <div className={`cb ${ev.task?.done ? 'checked' : ''}`}
                        onClick={e => { e.stopPropagation(); if (ev.task) toggleTask(ev.task.id); }}
                        style={{ flexShrink: 0, marginBottom: '4px' }}>
                        {ev.task?.done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '700' }}>✓</span>}
                      </div>
                    )}
                    <div style={{ fontWeight: '600', textDecoration: ev.task?.done ? 'line-through' : 'none', color: ev.task?.done ? 'var(--text-3)' : 'var(--text)', marginBottom: '2px' }}>
                      {clsIcon[ev.cls]}{ev.label}{isTentative && <span style={{ fontSize: '9px', marginLeft: '4px', color: '#E07070' }}>?</span>}
                    </div>
                    {isOutlook && ev.outlookEv.body_preview && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{ev.outlookEv.body_preview.slice(0, 60)}…</div>}
                    {isOutlook && <div style={{ fontSize: '9px', color: isTentative ? '#E07070' : ev.cls === 'outlook_evt' ? 'var(--text-3)' : '#C0392B', marginTop: '2px' }}>
                      {ev.cls === 'outlook_evt' ? 'Outlook event' : isTentative ? 'Not responded · Outlook' : 'Accepted · Outlook'} · Tap to view
                    </div>}
                    {isTask && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{item ? item.name : 'Standalone'}{ev.task?.assigned_to ? ' · ' + ev.task.assigned_to : ''}{ev.task?.meeting_time ? ' @ ' + fmtTime(ev.task.meeting_time) : ''}</div>}
                    {!isTask && !isOutlook && fac && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{fac.name}</div>}
                  </div>
                );
              };
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#0C447C', background: '#EBF3FD', padding: '5px 8px', borderRadius: 'var(--radius)', marginBottom: '8px', textAlign: 'center' }}>☑ Tasks ({evTasks.length})</div>
                    {evTasks.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>None</div> : evTasks.map(renderEv)}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#A93226', background: '#FDEAEA', padding: '5px 8px', borderRadius: 'var(--radius)', marginBottom: '8px', textAlign: 'center' }}>📅 Meetings ({evMeetings.length})</div>
                    {evMeetings.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>None</div> : evMeetings.map(renderEv)}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#5B21B6', background: '#F0EEFF', padding: '5px 8px', borderRadius: 'var(--radius)', marginBottom: '8px', textAlign: 'center' }}>★ Events ({evEvents.length})</div>
                    {evEvents.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', padding: '8px 0' }}>None</div> : evEvents.map(renderEv)}
                  </div>
                </div>
              );
            })()}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              onClick={() => { setTaskForm(p => ({ ...p, due_date: selectedDate })); setAddType('task'); setShowAdd(true); setSelectedDate(null); }}>
              + Add something on this day
            </button>
          </div>
        </div>
      )}
 
      {/* Task/Meeting detail + edit popup */}
      {selectedTask && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setSelectedTask(null)}>
          <div className="sheet-center" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{selectedTask.task_type === 'meeting' ? '📅 Meeting' : '☑ Task'}</h2>
              <button className="btn-icon" onClick={() => { setSelectedTask(null); setEditingTask(false); }} style={{ fontSize: '18px' }}>×</button>
            </div>
            {!editingTask ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', textDecoration: selectedTask.done ? 'line-through' : 'none', color: selectedTask.done ? 'var(--text-3)' : 'var(--text)' }}>{selectedTask.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedTask.priority && selectedTask.task_type !== 'meeting' && <span className={`badge badge-${selectedTask.priority?.toLowerCase()}`}>{selectedTask.priority}</span>}
                    {selectedTask.assigned_to && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>👤 {selectedTask.assigned_to}</span>}
                    {selectedTask.due_date && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>📅 {selectedTask.due_date}{selectedTask.meeting_time ? ' @ ' + fmtTime(selectedTask.meeting_time) : ''}</span>}
                    {selectedTask.attendees && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>👥 {selectedTask.attendees}</span>}
                    {selectedTask.recur_type && selectedTask.recur_type !== 'never' && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#F0FBF7', color: '#1D9E75', fontWeight: '600', border: '1px solid #C8EDD8' }}>🔁 {RECUR_LABEL[selectedTask.recur_type]}</span>}
                    <span className="badge" style={{ background: selectedTask.done ? 'var(--green-light)' : 'var(--gray-light)', color: selectedTask.done ? 'var(--green-text)' : 'var(--gray)' }}>{selectedTask.done ? 'Done' : 'Open'}</span>
                  </div>
                  {selectedTask.notes && <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '10px', lineHeight: '1.6', background: 'var(--bg)', padding: '10px 12px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--green)' }}>{selectedTask.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { toggleTask(selectedTask.id); setSelectedTask(p => ({ ...p, done: !p.done })); }}>
                    {selectedTask.done ? '↩ Reopen' : '✓ Mark done'}
                  </button>
                  <button className="btn btn-sm" onClick={() => { setEditTaskForm({ name: selectedTask.name, due_date: selectedTask.due_date || '', meeting_time: selectedTask.meeting_time || '', assigned_to: selectedTask.assigned_to || '', attendees: selectedTask.attendees || '', priority: selectedTask.priority || 'Medium', notes: selectedTask.notes || '', task_type: selectedTask.task_type || 'task', recur_type: selectedTask.recur_type || 'never', recur_days: selectedTask.recur_days || '', item_id: selectedTask.item_id || null }); setEditingTask(true); }}>Edit</button>
                  <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }}>Delete</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {[['task','☑ Task'],['meeting','📅 Meeting']].map(([t, l]) => (
                    <button key={t} onClick={() => setEditTaskForm(p => ({ ...p, task_type: t }))}
                      style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: editTaskForm.task_type === t ? 'var(--text)' : 'var(--surface)', color: editTaskForm.task_type === t ? '#fff' : 'var(--text-2)' }}>{l}</button>
                  ))}
                </div>
                <div className="form-row" style={{ marginBottom: '10px' }}>
                  <div className="form-group full"><label>Name</label><input value={editTaskForm.name} onChange={e => setEditTaskForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                  <div className="form-group"><label>Date</label><input type="date" value={editTaskForm.due_date} onChange={e => setEditTaskForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                  {editTaskForm.task_type === 'meeting' && <div className="form-group"><label>Time</label><input type="time" value={editTaskForm.meeting_time} onChange={e => setEditTaskForm(p => ({ ...p, meeting_time: e.target.value }))} /></div>}
                  <div className="form-group"><label>Assigned to</label><input value={editTaskForm.assigned_to} onChange={e => setEditTaskForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                  {editTaskForm.task_type !== 'meeting' && <div className="form-group"><label>Priority</label>
                    <select value={editTaskForm.priority} onChange={e => setEditTaskForm(p => ({ ...p, priority: e.target.value }))}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>}
                  {editTaskForm.task_type === 'meeting' && <div className="form-group full"><label>Attendees</label><input value={editTaskForm.attendees} onChange={e => setEditTaskForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Names separated by commas…" /></div>}
                  <div className="form-group full"><label>Notes</label><textarea value={editTaskForm.notes} onChange={e => setEditTaskForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <RecurPicker value={editTaskForm.recur_type} days={editTaskForm.recur_days} onChange={v => setEditTaskForm(p => ({ ...p, recur_type: v }))} onDaysChange={v => setEditTaskForm(p => ({ ...p, recur_days: v }))} />
                <div className="form-actions" style={{ marginTop: '12px' }}>
                  <button className="btn btn-sm" onClick={() => setEditingTask(false)}>Cancel</button>
                  <button className="btn btn-sm btn-primary" onClick={handleSaveTaskEdit}>Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
 
      {/* Outlook event detail popup */}
      {selectedOutlook && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setSelectedOutlook(null)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#FDEAEA', color: '#A93226', fontWeight: '600' }}>Outlook</span>
                {selectedOutlook.response_status === 'tentative' && <span style={{ fontSize: '11px', color: '#E07070', fontWeight: '600' }}>? Not responded</span>}
                {(selectedOutlook.response_status === 'accepted' || selectedOutlook.response_status === 'organizer') && <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '600' }}>✓ Accepted</span>}
              </div>
              <button className="btn-icon" onClick={() => setSelectedOutlook(null)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', lineHeight: '1.3' }}>{selectedOutlook.subject || 'No subject'}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {selectedOutlook.start_date && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>📅 {selectedOutlook.start_date}{selectedOutlook.start_time ? ' @ ' + fmtTime(selectedOutlook.start_time) : ''}</span>}
              {selectedOutlook.is_all_day && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>All day</span>}
              {selectedOutlook.has_attendees && <span className="badge" style={{ background: '#FDEAEA', color: '#A93226' }}>👥 Has attendees</span>}
              {selectedOutlook.is_online_meeting && <span className="badge" style={{ background: '#EBF3FD', color: '#0C447C' }}>💻 Online meeting</span>}
            </div>
            {selectedOutlook.body_preview && (
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', background: 'var(--bg)', padding: '10px 12px', borderRadius: 'var(--radius)', marginBottom: '14px' }}>
                {selectedOutlook.body_preview}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px' }}>Convert this Outlook meeting into a project so you can add tasks, notes, and track it in your Pipeline:</div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => convertOutlookToProject(selectedOutlook)}>
                ◆ Convert to project in Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

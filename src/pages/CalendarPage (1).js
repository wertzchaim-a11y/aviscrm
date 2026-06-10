import React, { useState, useEffect } from 'react';
import ItemSheet from '../components/ItemSheet';
import OutlookConnect from '../components/OutlookConnect';
import { getValidAccessToken, fetchOutlookEvents, isOutlookConnected } from '../lib/outlookSync';

const RESP_COLS = ['Marketing', 'Employee retention', 'Recruitment', 'Other'];
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

export default function CalendarPage({ data }) {
  const { facilities, items, steps, tasks, notes, ideas, addItem, addTask, addStep, toggleStep, deleteStep, updateItem, deleteItem, updateTask, toggleTask, deleteTask, addNote, deleteNote, addIdea, calcProgress } = data;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filters, setFilters] = useState({ task: true, event: true, project: true });
  const [openItem, setOpenItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [addType, setAddType] = useState('task');
  const [itemForm, setItemForm] = useState({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '' });
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [outlookConnected, setOutlookConnected] = useState(isOutlookConnected());
  const [showOutlook, setShowOutlook] = useState(true);
  const [meetingForm, setMeetingForm] = useState({ name: '', due_date: '', meeting_time: '', assigned_to: '', attendees: '', notes: '', item_id: '' });
  const [activeTab, setActiveTab] = useState('details');
  const [quickSteps, setQuickSteps] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [quickIdeas, setQuickIdeas] = useState([]);
  const [stepInput, setStepInput] = useState('');
  const [taskInput, setTaskInput] = useState({ name: '', due_date: '', priority: 'Medium' });
  const [noteInput, setNoteInput] = useState('');
  const [ideaInput, setIdeaInput] = useState({ title: '', body: '' });

  const todayStr = now.toISOString().slice(0, 10);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const monthStr = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!outlookConnected) return;
    const fetchOL = async () => {
      const token = await getValidAccessToken();
      if (!token) return;
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
      const events = await fetchOutlookEvents(token, start, end);
      if (events) setOutlookEvents(events);
    };
    fetchOL();
  }, [year, month, outlookConnected]);

  const resetAdd = () => {
    setShowAdd(false); setActiveTab('details');
    setQuickSteps([]); setQuickTasks([]); setQuickNotes([]); setQuickIdeas([]);
    setStepInput(''); setTaskInput({ name: '', due_date: '', priority: 'Medium' });
    setNoteInput(''); setIdeaInput({ title: '', body: '' });
    setMeetingForm({ name: '', due_date: '', meeting_time: '', assigned_to: '', attendees: '', notes: '', item_id: '' });
    setTaskForm({ name: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '', item_id: '' });
  };

  const toggleFilter = (key) => setFilters(p => ({ ...p, [key]: !p[key] }));
  const move = (dir) => {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  const handleSave = async () => {
    if (addType === 'task') {
      if (!taskForm.name.trim()) return;
      await addTask({ name: taskForm.name.trim(), due_date: taskForm.due_date || null, assigned_to: taskForm.assigned_to || null, priority: taskForm.priority || 'Medium', notes: taskForm.notes || null, item_id: taskForm.item_id || null, step_id: null, done: false, task_type: 'task' });
    } else if (addType === 'meeting') {
      if (!meetingForm.name.trim()) return;
      await addTask({ name: meetingForm.name.trim(), due_date: meetingForm.due_date || null, meeting_time: meetingForm.meeting_time || null, assigned_to: meetingForm.assigned_to || null, attendees: meetingForm.attendees || null, notes: meetingForm.notes || null, item_id: meetingForm.item_id || null, step_id: null, done: false, task_type: 'meeting', priority: 'Medium' });
    } else {
      if (!itemForm.name.trim() || !itemForm.facility_id) return;
      const newItem = await addItem({ ...itemForm, type: addType });
      if (newItem) {
        for (const s of quickSteps) await addStep({ item_id: newItem.id, name: s });
        for (const t of quickTasks) await addTask({ item_id: newItem.id, name: t.name, due_date: t.due_date || null, priority: t.priority, step_id: null, done: false, task_type: 'task' });
        for (const n of quickNotes) await addNote({ item_id: newItem.id, text: n });
        for (const id of quickIdeas) await addIdea({ title: id.title, responsibility: itemForm.responsibility, body: id.body });
      }
      setItemForm({ name: '', type: 'project', facility_id: '', responsibility: 'Marketing', due_date: '', assigned_to: '' });
    }
    resetAdd();
  };

  const evMap = {};
  const addEv = (date, entry) => { if (!date) return; (evMap[date] = evMap[date] || []).push(entry); };
  items.forEach(item => {
    if (filters.project && item.type === 'project' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'proj', id: item.id });
    if (filters.event && item.type === 'event' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'evt', id: item.id });
    if (item.type === 'meeting' && item.due_date) addEv(item.due_date, { label: item.name, cls: 'mtg_item', id: item.id });
  });
  if (filters.task) tasks.forEach(t => {
    if (t.due_date) {
      const item = items.find(i => i.id === t.item_id);
      const cls = t.task_type === 'meeting' ? 'mtg' : 'tsk';
      addEv(t.due_date, { label: t.name, cls, id: item?.id, task_id: t.id, task: t });
    }
  });
  if (outlookConnected && showOutlook) {
    outlookEvents.forEach(ev => {
      const date = ev.isAllDay ? ev.start.date : ev.start.dateTime?.slice(0, 10);
      const hasAttendees = ev.attendees && ev.attendees.length > 0;
      const isOnline = ev.isOnlineMeeting;
      const response = ev.responseStatus?.response || 'none';
      const accepted = response === 'accepted' || response === 'organizer';
      const cls = (hasAttendees || isOnline) ? (accepted ? 'outlook_mtg_yes' : 'outlook_mtg_maybe') : 'outlook_evt';
      if (date) addEv(date, { label: ev.subject, cls, id: null, preview: ev.bodyPreview, response });
    });
  }

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const clsColor = {
    proj:             { background: '#EEEDFE', color: '#3C3489' },
    evt:              { background: '#F0EEFF', color: '#5B21B6' },
    tsk:              { background: '#EBF3FD', color: '#0C447C' },
    mtg:              { background: '#FDEAEA', color: '#A93226' },
    mtg_item:         { background: '#FDEAEA', color: '#A93226' },
    outlook_mtg_yes:  { background: '#FDEAEA', color: '#A93226' },
    outlook_mtg_maybe:{ background: '#FEF3F3', color: '#E07070' },
    outlook_evt:      { background: '#F0EEFF', color: '#5B21B6' },
  };
  const clsBorder = { proj: '#4F46E5', evt: '#7C3AED', tsk: '#0C447C', mtg: '#C0392B', mtg_item: '#C0392B', outlook_mtg_yes: '#C0392B', outlook_mtg_maybe: '#E07070', outlook_evt: '#7C3AED' };
  const clsIcon = { tsk: '☑ ', mtg: '📅 ', mtg_item: '📅 ', proj: '◆ ', evt: '★ ', outlook_mtg_yes: '📅 ', outlook_mtg_maybe: '📅 ', outlook_evt: '★ ' };

  const openItemObj = items.find(i => i.id === openItem);
  const openFacility = facilities.find(f => f.id === openItemObj?.facility_id);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 0 80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Calendar</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <OutlookConnect onConnected={() => setOutlookConnected(true)} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[['task','☑ Tasks','#EBF3FD','#0C447C'], ['event','★ Events','#F0EEFF','#5B21B6'], ['project','◆ Projects','#EEEDFE','#3C3489']].map(([key, label, bg, col]) => (
            <button key={key} onClick={() => toggleFilter(key)}
              style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontFamily: 'var(--font)', fontWeight: '600', cursor: 'pointer', background: filters[key] ? bg : 'var(--surface)', color: filters[key] ? col : 'var(--text-3)', border: `1px solid ${filters[key] ? col + '60' : 'var(--border)'}` }}>
              {label}
            </button>
          ))}
          {outlookConnected && (
            <button onClick={() => setShowOutlook(p => !p)}
              style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontFamily: 'var(--font)', fontWeight: '600', cursor: 'pointer', background: showOutlook ? '#FDEAEA' : 'var(--surface)', color: showOutlook ? '#A93226' : 'var(--text-3)', border: `1px solid ${showOutlook ? '#C0392B60' : 'var(--border)'}` }}>
              📅 Outlook
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn-icon" onClick={() => move(-1)}>‹</button>
            <span style={{ fontWeight: '600', fontSize: '14px', minWidth: '110px', textAlign: 'center' }}>{monthStr}</span>
            <button className="btn-icon" onClick={() => move(1)}>›</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '2px' }}>
          {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-3)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '.4px' }}>{d}</div>)}
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
                  <div key={ei} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '0 5px 5px 0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', opacity: ev.task?.done ? 0.45 : 1, textDecoration: ev.task?.done ? 'line-through' : 'none', borderLeft: `3px solid ${clsBorder[ev.cls] || '#aaa'}`, ...clsColor[ev.cls] }}>
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
              {[['task', 'Task'], ['meeting', '📅 Meeting'], ['project', 'Project'], ['event', 'Event']].map(([t, l]) => (
                <button key={t} onClick={() => setAddType(t)}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: '500', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--font)', cursor: 'pointer', background: addType === t ? 'var(--text)' : 'var(--surface)', color: addType === t ? '#fff' : 'var(--text-2)' }}>
                  {l}
                </button>
              ))}
            </div>
            {addType === 'task' && (
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
            )}
            {addType === 'meeting' && (
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
                    <div className="form-row" style={{ marginBottom: '8px' }}>
                      <div className="form-group full"><label>Task name</label><input value={taskInput.name} onChange={e => setTaskInput(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                      <div className="form-group"><label>Due date</label><input type="date" value={taskInput.due_date} onChange={e => setTaskInput(p => ({ ...p, due_date: e.target.value }))} /></div>
                      <div className="form-group"><label>Priority</label>
                        <select value={taskInput.priority} onChange={e => setTaskInput(p => ({ ...p, priority: e.target.value }))}>
                          <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-primary" style={{ marginBottom: '10px' }} onClick={() => { if (taskInput.name.trim()) { setQuickTasks(p => [...p, { ...taskInput }]); setTaskInput({ name: '', due_date: '', priority: 'Medium' }); }}}>Add task</button>
                    {quickTasks.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No tasks yet.</div> : quickTasks.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                        <span style={{ flex: 1 }}>{t.name}</span><span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{t.priority}</span>
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
              <button className="btn btn-sm btn-primary" onClick={handleSave}>Save {addType === 'meeting' ? 'meeting' : addType === 'task' ? 'task' : addType}</button>
            </div>
          </div>
        </div>
      )}

      {openItemObj && (
        <ItemSheet item={openItemObj} facility={openFacility}
          steps={steps} tasks={tasks} notes={notes} ideas={ideas}
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
                const isOutlook = ev.cls === 'outlook_mtg_yes' || ev.cls === 'outlook_mtg_maybe' || ev.cls === 'outlook_evt';
                const isTask = ev.cls === 'tsk' || ev.cls === 'mtg';
                const isTentative = ev.cls === 'outlook_mtg_maybe';
                return (
                  <div key={i} className="card" style={{ padding: '8px 10px', marginBottom: '6px', cursor: isOutlook ? 'default' : 'pointer', fontSize: '12px', borderLeft: `3px solid ${clsBorder[ev.cls] || '#aaa'}`, opacity: isTentative ? 0.75 : 1 }}
                    onClick={() => {
                      if (isOutlook) return;
                      if (isTask && ev.id) { setOpenItem(ev.id); setSelectedDate(null); }
                      else if (isTask && !ev.id) { setSelectedTask(ev.task); setSelectedDate(null); }
                      else if (ev.id) { setOpenItem(ev.id); setSelectedDate(null); }
                    }}>
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
                    {isOutlook && ev.preview && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{ev.preview.slice(0, 50)}…</div>}
                    {isOutlook && ev.cls !== 'outlook_evt' && <div style={{ fontSize: '9px', color: isTentative ? '#E07070' : '#C0392B', marginTop: '2px' }}>{isTentative ? 'Not responded' : 'Accepted'} · Outlook</div>}
                    {isOutlook && ev.cls === 'outlook_evt' && <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '2px' }}>Outlook</div>}
                    {isTask && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{item ? item.name : 'Standalone'}{ev.task?.assigned_to ? ' · ' + ev.task.assigned_to : ''}{ev.task?.meeting_time ? ' @ ' + ev.task.meeting_time : ''}</div>}
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

      {/* Standalone task popup */}
      {selectedTask && (
        <div className="overlay overlay-center" onClick={e => e.target === e.currentTarget && setSelectedTask(null)}>
          <div className="sheet-center" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{selectedTask.task_type === 'meeting' ? 'Meeting' : 'Task'}</h2>
              <button className="btn-icon" onClick={() => setSelectedTask(null)} style={{ fontSize: '18px' }}>×</button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', textDecoration: selectedTask.done ? 'line-through' : 'none', color: selectedTask.done ? 'var(--text-3)' : 'var(--text)' }}>{selectedTask.name}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {selectedTask.priority && selectedTask.task_type !== 'meeting' && <span className={`badge badge-${selectedTask.priority?.toLowerCase()}`}>{selectedTask.priority}</span>}
                {selectedTask.assigned_to && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>{selectedTask.assigned_to}</span>}
                {selectedTask.due_date && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>Due {selectedTask.due_date}{selectedTask.meeting_time ? ' @ ' + selectedTask.meeting_time : ''}</span>}
                {selectedTask.attendees && <span className="badge" style={{ background: 'var(--gray-light)', color: 'var(--gray)' }}>👥 {selectedTask.attendees}</span>}
                <span className="badge" style={{ background: selectedTask.done ? 'var(--green-light)' : 'var(--gray-light)', color: selectedTask.done ? 'var(--green-text)' : 'var(--gray)' }}>{selectedTask.done ? 'Done' : 'Open'}</span>
              </div>
              {selectedTask.notes && <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '10px', lineHeight: '1.6' }}>{selectedTask.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-primary" onClick={() => { toggleTask(selectedTask.id); setSelectedTask(p => ({ ...p, done: !p.done })); }}>
                {selectedTask.done ? 'Mark open' : 'Mark done'}
              </button>
              <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

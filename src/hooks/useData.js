import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Extended data hook - same API as before, plus rhythms (periods + logs),
// facility-note CRUD, note updates, and task-note support.
export function useData() {
  const [facilities, setFacilities] = useState([]);
  const [items, setItems] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [facilityNotes, setFacilityNotes] = useState([]);
  const [outlookDbEvents, setOutlookDbEvents] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [recurringLogs, setRecurringLogs] = useState([]);
  const [rhythmPeriods, setRhythmPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [f, i, s, t, n, id, ol, fn, ri, rl, rp] = await Promise.all([
      supabase.from('facilities').select('*').order('position'),
      supabase.from('items').select('*').order('position').order('created_at'),
      supabase.from('steps').select('*').order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('notes').select('*').order('created_at'),
      supabase.from('ideas').select('*').order('created_at', { ascending: false }),
      supabase.from('outlook_events').select('*').order('start_date'),
      supabase.from('facility_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('recurring_items').select('*').eq('active', true).order('created_at'),
      supabase.from('recurring_logs').select('*').order('log_date', { ascending: false }),
      supabase.from('rhythm_periods').select('*').order('start_date', { ascending: false }),
    ]);
    setFacilities(f.data || []);
    setItems(i.data || []);
    setSteps(s.data || []);
    setTasks(t.data || []);
    setNotes(n.data || []);
    setIdeas(id.data || []);
    setOutlookDbEvents(ol.data || []);
    setFacilityNotes(fn.data || []);
    setRecurringItems(ri.data || []);
    setRecurringLogs(rl.data || []);
    setRhythmPeriods(rp.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ?? ITEMS (projects/events) ??
  const addItem = async (data) => {
    const clean = {
      name: data.name, type: data.type || 'project', facility_id: data.facility_id || null,
      responsibility: data.responsibility || 'Marketing', due_date: data.due_date || null,
      event_time: data.event_time || null, assigned_to: data.assigned_to || null,
      progress: data.progress ?? 0, manual_progress: data.manual_progress ?? false,
      completed: false, position: data.position ?? 0, is_priority: data.is_priority ?? false,
      stream: data.stream || null, recur_type: data.recur_type || 'never',
    };
    const { data: row, error } = await supabase.from('items').insert(clean).select().single();
    if (error) { console.error('addItem:', error); return null; }
    if (row) setItems(prev => [...prev, row]);
    return row;
  };
  const updateItem = async (id, data) => {
    const { data: row, error } = await supabase.from('items').update(data).eq('id', id).select().single();
    if (error) { console.error('updateItem:', error); return; }
    if (row) setItems(prev => prev.map(i => i.id === id ? row : i));
  };
  const deleteItem = async (id) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { console.error('deleteItem:', error); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    setSteps(prev => prev.filter(s => s.item_id !== id));
    setTasks(prev => prev.filter(t => t.item_id !== id));
    setNotes(prev => prev.filter(n => n.item_id !== id));
    setIdeas(prev => prev.map(i => i.item_id === id ? { ...i, item_id: null } : i));
  };
  const moveItem = async (id, dir, peerIds) => {
    // peerIds: ordered ids within the same visible group; swap positions with neighbor
    const idx = peerIds.indexOf(id);
    const swapWith = peerIds[idx + dir];
    if (swapWith == null) return;
    const reordered = [...peerIds];
    reordered[idx] = swapWith; reordered[idx + dir] = id;
    setItems(prev => prev.map(i => { const p = reordered.indexOf(i.id); return p >= 0 ? { ...i, position: p } : i; }));
    try { await Promise.all(reordered.map((iid, pos) => supabase.from('items').update({ position: pos }).eq('id', iid))); }
    catch (e) { console.error('moveItem:', e); }
  };
  // Complete/reopen; when the item counts as a rhythm stream, log/unlog it
  const toggleItemComplete = async (item) => {
    const nowDone = !item.completed;
    await updateItem(item.id, { completed: nowDone, completed_at: nowDone ? new Date().toISOString() : null });
    if (!item.stream) return;
    if (nowDone) {
      const { data: row } = await supabase.from('recurring_logs').insert({
        recurring_item_id: item.stream, item_id: item.id, facility_id: item.facility_id || null,
        log_date: new Date().toISOString().slice(0, 10), notes: 'done ' + item.name + ' - completed project',
      }).select().single();
      if (row) setRecurringLogs(prev => [row, ...prev]);
    } else {
      const auto = recurringLogs.find(l => l.item_id === item.id && l.recurring_item_id === item.stream);
      if (auto) { await supabase.from('recurring_logs').delete().eq('id', auto.id); setRecurringLogs(prev => prev.filter(l => l.id !== auto.id)); }
    }
  };

  // ?? STEPS ??
  const addStep = async (data) => {
    const { data: row, error } = await supabase.from('steps').insert({ item_id: data.item_id, name: data.name, done: false }).select().single();
    if (error) { console.error('addStep:', error); return; }
    if (row) setSteps(prev => [...prev, row]);
  };
  const toggleStep = async (id) => {
    const step = steps.find(s => s.id === id);
    if (!step) return;
    const { data: row } = await supabase.from('steps').update({ done: !step.done }).eq('id', id).select().single();
    if (row) setSteps(prev => prev.map(s => s.id === id ? row : s));
  };
  const deleteStep = async (id) => {
    await supabase.from('steps').delete().eq('id', id);
    setSteps(prev => prev.filter(s => s.id !== id));
    setTasks(prev => prev.map(t => t.step_id === id ? { ...t, step_id: null } : t));
  };

  // ?? TASKS (incl. meetings via task_type) ??
  const addTask = async (data) => {
    const clean = {
      name: data.name, due_date: data.due_date || null, assigned_to: data.assigned_to || null,
      priority: data.priority || 'Medium', notes: data.notes || null,
      item_id: data.item_id || null, step_id: data.step_id || null, done: false,
      task_type: data.task_type || 'task', meeting_time: data.meeting_time || null,
      attendees: data.attendees || null, recur_type: data.recur_type || 'never',
      recur_days: data.recur_days || null, recur_parent_id: data.recur_parent_id || null,
      is_priority: data.is_priority ?? false, rhythm_id: data.rhythm_id || null,
      rhythm_start: data.rhythm_start || null, facility_note_id: data.facility_note_id || null,
    };
    const { data: row, error } = await supabase.from('tasks').insert(clean).select().single();
    if (error) { console.error('addTask:', error); return null; }
    if (row) setTasks(prev => [...prev, row]);
    return row;
  };
  const updateTask = async (id, data) => {
    const { data: row, error } = await supabase.from('tasks').update(data).eq('id', id).select().single();
    if (error) { console.error('updateTask:', error); return; }
    if (row) setTasks(prev => prev.map(t => t.id === id ? row : t));
  };
  const nextRecurDate = (due_date, recur_type) => {
    if (!due_date || recur_type === 'never') return null;
    const base = new Date(due_date + 'T12:00:00');
    if (recur_type === 'daily') base.setDate(base.getDate() + 1);
    else if (recur_type === 'weekly') base.setDate(base.getDate() + 7);
    else if (recur_type === 'biweekly') base.setDate(base.getDate() + 14);
    else if (recur_type === 'monthly') base.setMonth(base.getMonth() + 1);
    else return null;
    return base.toISOString().slice(0, 10);
  };
  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    const completedAt = nowDone ? new Date().toISOString() : null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: nowDone, completed_at: completedAt } : t));
    const { data: row, error } = await supabase.from('tasks').update({ done: nowDone, completed_at: completedAt }).eq('id', id).select().single();
    if (error) { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !nowDone } : t)); return; }
    if (row) setTasks(prev => prev.map(t => t.id === id ? row : t));
    if (nowDone && task.recur_type && task.recur_type !== 'never') {
      const nextDate = nextRecurDate(task.due_date, task.recur_type);
      if (nextDate) await addTask({ ...task, id: undefined, due_date: nextDate, done: false, recur_parent_id: task.id });
    }
  };
  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setNotes(prev => prev.filter(n => n.task_id !== id));
  };

  // ?? NOTES (on items, tasks, or rhythm periods) ??
  const addNote = async (data) => {
    const { data: row, error } = await supabase.from('notes').insert(data).select().single();
    if (error) { console.error('addNote:', error); return; }
    if (row) setNotes(prev => [...prev, row]);
  };
  const updateNote = async (id, text) => {
    const { data: row } = await supabase.from('notes').update({ text }).eq('id', id).select().single();
    if (row) setNotes(prev => prev.map(n => n.id === id ? row : n));
  };
  const deleteNote = async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // ?? IDEAS ??
  const addIdea = async (data) => {
    const { data: row, error } = await supabase.from('ideas').insert(data).select().single();
    if (error) { console.error('addIdea:', error); return; }
    if (row) setIdeas(prev => [row, ...prev]);
  };
  const updateIdea = async (id, data) => {
    const { data: row } = await supabase.from('ideas').update(data).eq('id', id).select().single();
    if (row) setIdeas(prev => prev.map(i => i.id === id ? row : i));
  };
  const deleteIdea = async (id) => {
    await supabase.from('ideas').delete().eq('id', id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  // ?? FACILITY NOTES (memos on the Notes page) ??
  const addFacilityNote = async (data) => {
    const { data: row, error } = await supabase.from('facility_notes').insert(data).select().single();
    if (error) { console.error('addFacilityNote:', error); return null; }
    if (row) setFacilityNotes(prev => [row, ...prev]);
    return row;
  };
  const updateFacilityNote = async (id, data) => {
    const { data: row } = await supabase.from('facility_notes').update(data).eq('id', id).select().single();
    if (row) setFacilityNotes(prev => prev.map(n => n.id === id ? row : n));
  };
  const deleteFacilityNote = async (id) => {
    await supabase.from('facility_notes').delete().eq('id', id);
    setFacilityNotes(prev => prev.filter(n => n.id !== id));
    setTasks(prev => prev.map(t => t.facility_note_id === id ? { ...t, facility_note_id: null } : t));
  };

  // ?? RHYTHM PERIODS (fundamental / marketing theme) ??
  const setRhythmPeriod = async ({ tracker, start_date, title, description }) => {
    const { data: row, error } = await supabase.from('rhythm_periods')
      .upsert({ tracker, start_date, title, description: description || null }, { onConflict: 'tracker,start_date' })
      .select().single();
    if (error) { console.error('setRhythmPeriod:', error); return; }
    if (row) setRhythmPeriods(prev => [row, ...prev.filter(p => !(p.tracker === tracker && p.start_date === start_date))]);
  };
  const deleteRhythmPeriod = async (id) => {
    await supabase.from('rhythm_periods').delete().eq('id', id);
    setRhythmPeriods(prev => prev.filter(p => p.id !== id));
  };

  // ?? RECURRING LOGS (facility events / doctor visits) ??
  const addRecurringLog = async (data) => {
    const clean = { recurring_item_id: data.recurring_item_id, notes: data.notes || null, item_id: data.item_id || null, facility_id: data.facility_id || null, log_date: data.log_date || new Date().toISOString().slice(0, 10) };
    const { data: row, error } = await supabase.from('recurring_logs').insert(clean).select().single();
    if (error) { console.error('addRecurringLog:', error); return; }
    if (row) setRecurringLogs(prev => [row, ...prev].sort((a, b) => a.log_date < b.log_date ? 1 : -1));
  };
  const updateRecurringLog = async (id, data) => {
    const { data: row } = await supabase.from('recurring_logs').update(data).eq('id', id).select().single();
    if (row) setRecurringLogs(prev => prev.map(l => l.id === id ? row : l).sort((a, b) => a.log_date < b.log_date ? 1 : -1));
  };
  const deleteRecurringLog = async (id) => {
    await supabase.from('recurring_logs').delete().eq('id', id);
    setRecurringLogs(prev => prev.filter(l => l.id !== id));
  };

  const calcProgress = useCallback((item) => {
    if (item.manual_progress) return item.progress;
    const itemSteps = steps.filter(s => s.item_id === item.id);
    if (itemSteps.length > 0) return Math.round(itemSteps.filter(s => s.done).length / itemSteps.length * 100);
    const itemTasks = tasks.filter(t => t.item_id === item.id);
    if (itemTasks.length > 0) return Math.round(itemTasks.filter(t => t.done).length / itemTasks.length * 100);
    return item.completed ? 100 : 0;
  }, [steps, tasks]);

  const refreshOutlookEvents = async () => {
    const { data: ol } = await supabase.from('outlook_events').select('*').order('start_date');
    setOutlookDbEvents(ol || []);
  };

  return {
    facilities, items, steps, tasks, notes, ideas, facilityNotes, outlookDbEvents,
    recurringItems, recurringLogs, rhythmPeriods, loading, fetchAll,
    addItem, updateItem, deleteItem, moveItem, toggleItemComplete,
    addStep, toggleStep, deleteStep,
    addTask, updateTask, toggleTask, deleteTask,
    addNote, updateNote, deleteNote,
    addIdea, updateIdea, deleteIdea,
    addFacilityNote, updateFacilityNote, deleteFacilityNote,
    setRhythmPeriod, deleteRhythmPeriod,
    addRecurringLog, updateRecurringLog, deleteRecurringLog,
    calcProgress, refreshOutlookEvents,
  };
}

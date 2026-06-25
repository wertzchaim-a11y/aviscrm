import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
 
export function useData() {
  const [facilities, setFacilities] = useState([]);
  const [items, setItems] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [facilityNotes, setFacilityNotes] = useState([]);
  const [outlookDbEvents, setOutlookDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);
 
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [f, i, s, t, n, id, ol, fn] = await Promise.all([
      supabase.from('facilities').select('*').order('position'),
      supabase.from('items').select('*').order('position').order('created_at'),
      supabase.from('steps').select('*').order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('notes').select('*').order('created_at'),
      supabase.from('ideas').select('*').order('created_at', { ascending: false }),
      supabase.from('outlook_events').select('*').order('start_date'),
      supabase.from('facility_notes').select('*').order('created_at', { ascending: false }),
    ]);
    setFacilities(f.data || []);
    setItems(i.data || []);
    setSteps(s.data || []);
    setTasks(t.data || []);
    setNotes(n.data || []);
    setIdeas(id.data || []);
    setOutlookDbEvents(ol.data || []);
    setFacilityNotes(fn.data || []);
    setLoading(false);
  }, []);
 
  useEffect(() => { fetchAll(); }, [fetchAll]);
 
  // FACILITIES
  const updateFacility = async (id, data) => {
    const { data: row, error } = await supabase.from('facilities').update(data).eq('id', id).select().single();
    if (error) console.error('updateFacility error:', error);
    if (row) setFacilities(prev => prev.map(f => f.id === id ? row : f));
  };
 
  // ITEMS
  const addItem = async (data) => {
    const cleanData = {
      name: data.name,
      type: data.type || 'project',
      facility_id: data.facility_id,
      responsibility: data.responsibility || 'Marketing',
      due_date: data.due_date || null,
      event_time: data.event_time || null,
      assigned_to: data.assigned_to || null,
      progress: data.progress ?? 0,
      manual_progress: data.manual_progress ?? false,
      completed: false,
      position: data.position ?? 0,
      is_priority: data.is_priority ?? false,
    };
    const { data: row, error } = await supabase.from('items').insert(cleanData).select().single();
    if (error) { console.error('addItem error:', error); return null; }
    if (row) setItems(prev => [...prev, row]);
    return row;
  };
  const reorderItems = async (facId, resp, fromIdx, toIdx, sortedItems) => {
    const filtered = sortedItems || items.filter(i => i.facility_id === facId && i.responsibility === resp && !i.completed);
    const others = items.filter(i => !(i.facility_id === facId && i.responsibility === resp && !i.completed));
    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((item, idx) => ({ ...item, position: idx }));
    setItems([...others, ...updated]);
    try { await Promise.all(updated.map(item => supabase.from('items').update({ position: item.position }).eq('id', item.id))); } catch (e) { console.error('reorderItems error:', e); }
  };
  const updateItem = async (id, data) => {
    const { data: row, error } = await supabase.from('items').update(data).eq('id', id).select().single();
    if (error) { console.error('updateItem error:', error); return; }
    if (row) setItems(prev => prev.map(i => i.id === id ? row : i));
  };
  const deleteItem = async (id) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { console.error('deleteItem error:', error); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    setSteps(prev => prev.filter(s => s.item_id !== id));
    setTasks(prev => prev.filter(t => t.item_id !== id));
    setNotes(prev => prev.filter(n => n.item_id !== id));
    setIdeas(prev => prev.map(i => i.item_id === id ? { ...i, item_id: null } : i));
  };
 
  // STEPS
  const addStep = async (data) => {
    const { data: row, error } = await supabase.from('steps').insert({ item_id: data.item_id, name: data.name, done: false }).select().single();
    if (error) { console.error('addStep error:', error); return; }
    if (row) setSteps(prev => [...prev, row]);
  };
  const toggleStep = async (id) => {
    const step = steps.find(s => s.id === id);
    if (!step) return;
    const { data: row, error } = await supabase.from('steps').update({ done: !step.done }).eq('id', id).select().single();
    if (error) { console.error('toggleStep error:', error); return; }
    if (row) setSteps(prev => prev.map(s => s.id === id ? row : s));
  };
  const deleteStep = async (id) => {
    const { error } = await supabase.from('steps').delete().eq('id', id);
    if (error) { console.error('deleteStep error:', error); return; }
    setSteps(prev => prev.filter(s => s.id !== id));
    setTasks(prev => prev.map(t => t.step_id === id ? { ...t, step_id: null } : t));
  };
 
  // TASKS
  const addTask = async (data) => {
    const cleanData = {
      name: data.name,
      due_date: data.due_date || null,
      assigned_to: data.assigned_to || null,
      priority: data.priority || 'Medium',
      notes: data.notes || null,
      item_id: data.item_id || null,
      step_id: data.step_id || null,
      done: false,
      task_type: data.task_type || 'task',
      meeting_time: data.meeting_time || null,
      attendees: data.attendees || null,
      recur_type: data.recur_type || 'never',
      recur_days: data.recur_days || null,
      recur_parent_id: data.recur_parent_id || null,
    };
    const { data: row, error } = await supabase.from('tasks').insert(cleanData).select().single();
    if (error) { console.error('addTask error:', error); return null; }
    if (row) setTasks(prev => [...prev, row]);
    return row;
  };
  const reorderTasks = async (fromIdx, toIdx, allFilteredTasks) => {
    const reordered = [...allFilteredTasks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((t, idx) => ({ ...t, position: idx }));
    setTasks(prev => {
      const ids = new Set(updated.map(t => t.id));
      return [...prev.filter(t => !ids.has(t.id)), ...updated];
    });
    try { await Promise.all(updated.map(t => supabase.from('tasks').update({ position: t.position }).eq('id', t.id))); } catch (e) { console.error('reorderTasks error:', e); }
  };
  const updateTask = async (id, data) => {
    const { data: row, error } = await supabase.from('tasks').update(data).eq('id', id).select().single();
    if (error) { console.error('updateTask error:', error); return; }
    if (row) setTasks(prev => prev.map(t => t.id === id ? row : t));
  };
  const nextRecurDate = (due_date, recur_type) => {
    if (!due_date || recur_type === 'never') return null;
    const base = new Date(due_date + 'T12:00:00');
    if (recur_type === 'daily') { base.setDate(base.getDate() + 1); }
    else if (recur_type === 'weekly') { base.setDate(base.getDate() + 7); }
    else if (recur_type === 'biweekly') { base.setDate(base.getDate() + 14); }
    else if (recur_type === 'monthly') { base.setMonth(base.getMonth() + 1); }
    else return null;
    return base.toISOString().slice(0, 10);
  };
  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    const completedAt = nowDone ? new Date().toISOString() : null;
    // Optimistic update first for instant UI response
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: nowDone, completed_at: completedAt } : t));
    const { data: row, error } = await supabase.from('tasks').update({ done: nowDone, completed_at: completedAt }).eq('id', id).select().single();
    if (error) {
      console.error('toggleTask error:', error);
      // Revert optimistic update on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !nowDone, completed_at: task.completed_at } : t));
      return;
    }
    if (row) setTasks(prev => prev.map(t => t.id === id ? row : t));
    // Auto-create next recurrence when marking done
    if (nowDone && task.recur_type && task.recur_type !== 'never') {
      const nextDate = nextRecurDate(task.due_date, task.recur_type);
      if (nextDate) await addTask({ name: task.name, due_date: nextDate, assigned_to: task.assigned_to, priority: task.priority, notes: task.notes, item_id: task.item_id, step_id: task.step_id, task_type: task.task_type, meeting_time: task.meeting_time, attendees: task.attendees, recur_type: task.recur_type, recur_days: task.recur_days, done: false, recur_parent_id: task.id });
    }
  };
  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { console.error('deleteTask error:', error); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
  };
 
  // NOTES
  const addNote = async (data) => {
    const { data: row, error } = await supabase.from('notes').insert(data).select().single();
    if (error) { console.error('addNote error:', error); return; }
    if (row) setNotes(prev => [...prev, row]);
  };
  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { console.error('deleteNote error:', error); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
  };
 
  // IDEAS
  const addIdea = async (data) => {
    const { data: row, error } = await supabase.from('ideas').insert(data).select().single();
    if (error) { console.error('addIdea error:', error); return; }
    if (row) setIdeas(prev => [row, ...prev]);
  };
  const updateIdea = async (id, data) => {
    const { data: row, error } = await supabase.from('ideas').update(data).eq('id', id).select().single();
    if (error) { console.error('updateIdea error:', error); return; }
    if (row) setIdeas(prev => prev.map(i => i.id === id ? row : i));
  };
  const deleteIdea = async (id) => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) { console.error('deleteIdea error:', error); return; }
    setIdeas(prev => prev.filter(i => i.id !== id));
  };
 
  // PROGRESS CALC
  const calcProgress = useCallback((item) => {
    if (item.manual_progress) return item.progress;
    const itemSteps = steps.filter(s => s.item_id === item.id);
    if (itemSteps.length > 0) return Math.round(itemSteps.filter(s => s.done).length / itemSteps.length * 100);
    const itemTasks = tasks.filter(t => t.item_id === item.id);
    if (itemTasks.length > 0) return Math.round(itemTasks.filter(t => t.done).length / itemTasks.length * 100);
    return 0;
  }, [steps, tasks]);
 
  const refreshOutlookEvents = async () => {
    const { data: ol } = await supabase.from('outlook_events').select('*').order('start_date');
    setOutlookDbEvents(ol || []);
  };
 
  return {
    facilities, items, steps, tasks, notes, ideas, facilityNotes, outlookDbEvents, loading, fetchAll,
    updateFacility,
    addItem, updateItem, deleteItem, reorderItems,
    addStep, toggleStep, deleteStep,
    addTask, updateTask, toggleTask, deleteTask, reorderTasks,
    addNote, deleteNote,
    addIdea, updateIdea, deleteIdea,
    calcProgress, refreshOutlookEvents,
  };
}
 

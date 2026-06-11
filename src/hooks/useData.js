import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useData() {
  const [facilities, setFacilities] = useState([]);
  const [items, setItems] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [outlookDbEvents, setOutlookDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [f, i, s, t, n, id, ol] = await Promise.all([
      supabase.from('facilities').select('*').order('position'),
      supabase.from('items').select('*').order('position').order('created_at'),
      supabase.from('steps').select('*').order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('notes').select('*').order('created_at'),
      supabase.from('ideas').select('*').order('created_at', { ascending: false }),
      supabase.from('outlook_events').select('*').order('start_date'),
    ]);
    setFacilities(f.data || []);
    setItems(i.data || []);
    setSteps(s.data || []);
    setTasks(t.data || []);
    setNotes(n.data || []);
    setIdeas(id.data || []);
    setOutlookDbEvents(ol.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateFacility = async (id, data) => {
    const { data: row } = await supabase.from('facilities').update(data).eq('id', id).select().single();
    if (row) setFacilities(prev => prev.map(f => f.id === id ? row : f));
  };

  // ITEMS
  const addItem = async (data) => {
    const { data: row, error } = await supabase.from('items').insert(data).select().single();
    if (error) console.error('addItem error:', error);
    if (row) { setItems(prev => [...prev, row]); return row; }
  };
  const reorderItems = async (facId, resp, fromIdx, toIdx) => {
    const filtered = items.filter(i => i.facility_id === facId && i.responsibility === resp);
    const others = items.filter(i => !(i.facility_id === facId && i.responsibility === resp));
    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((item, idx) => ({ ...item, position: idx }));
    setItems([...others, ...updated]);
    try { await Promise.all(updated.map(item => supabase.from('items').update({ position: item.position }).eq('id', item.id))); } catch(e) {}
  };
  const updateItem = async (id, data) => {
    const { data: row } = await supabase.from('items').update(data).eq('id', id).select().single();
    if (row) setItems(prev => prev.map(i => i.id === id ? row : i));
  };
  const deleteItem = async (id) => {
    await supabase.from('items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSteps(prev => prev.filter(s => s.item_id !== id));
    setTasks(prev => prev.filter(t => t.item_id !== id));
    setNotes(prev => prev.filter(n => n.item_id !== id));
  };

  // STEPS
  const addStep = async (data) => {
    const { data: row, error } = await supabase.from('steps').insert({ item_id: data.item_id, name: data.name, done: false }).select().single();
    if (error) console.error('addStep error:', error);
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
    };
    const { data: row, error } = await supabase.from('tasks').insert(cleanData).select().single();
    if (error) console.error('addTask error:', error);
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
    try { await Promise.all(updated.map(t => supabase.from('tasks').update({ position: t.position }).eq('id', t.id))); } catch(e) {}
  };
  const updateTask = async (id, data) => {
    const { data: row } = await supabase.from('tasks').update(data).eq('id', id).select().single();
    if (row) setTasks(prev => prev.map(t => t.id === id ? row : t));
  };
  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await updateTask(id, { done: !task.done });
  };
  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // NOTES
  const addNote = async (data) => {
    const { data: row } = await supabase.from('notes').insert(data).select().single();
    if (row) setNotes(prev => [...prev, row]);
  };
  const deleteNote = async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // IDEAS
  const addIdea = async (data) => {
    const { data: row } = await supabase.from('ideas').insert(data).select().single();
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

  // PROGRESS CALC
  const calcProgress = (item) => {
    if (item.manual_progress) return item.progress;
    const itemSteps = steps.filter(s => s.item_id === item.id);
    if (itemSteps.length > 0) return Math.round(itemSteps.filter(s => s.done).length / itemSteps.length * 100);
    const itemTasks = tasks.filter(t => t.item_id === item.id);
    if (itemTasks.length > 0) return Math.round(itemTasks.filter(t => t.done).length / itemTasks.length * 100);
    return 0;
  };

  const refreshOutlookEvents = async () => {
    const { data: ol } = await supabase.from('outlook_events').select('*').order('start_date');
    setOutlookDbEvents(ol || []);
  };

  return {
    facilities, items, steps, tasks, notes, ideas, outlookDbEvents, loading, fetchAll,
    updateFacility,
    addItem, updateItem, deleteItem, reorderItems,
    addStep, toggleStep, deleteStep,
    addTask, updateTask, toggleTask, deleteTask, reorderTasks,
    addNote, deleteNote,
    addIdea, updateIdea, deleteIdea,
    calcProgress, refreshOutlookEvents,
  };
}

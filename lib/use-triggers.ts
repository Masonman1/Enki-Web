// lib/use-triggers.ts
'use client';

import { useState, useEffect, useCallback } from 'react'; // Add useCallback
import { useSupabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Trigger {
  id: string;
  trigger_name: string;
  description: string;
  patterns: object;
  clause_template: string;
  created_at: string;
  updated_at: string;
}

export function useTriggers() {
  const supabase = useSupabase();
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTriggers = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('risk_triggers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTriggers(data || []);
    } catch (err) {
      toast.error('Fetch triggers failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]); // Dep on supabase

  useEffect(() => {
    fetchTriggers();
  }, [fetchTriggers]); // Dep on callback

  async function insertTrigger(trigger: Omit<Trigger, 'id' | 'created_at' | 'updated_at'>) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('risk_triggers').insert(trigger);
      if (error) throw error;
      toast.success('Trigger added');
      fetchTriggers();
    } catch (err) {
      toast.error('Insert failed');
      console.error(err);
    }
  }

  async function updateTrigger(id: string, updates: Partial<Trigger>) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('risk_triggers').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Trigger updated');
      fetchTriggers();
    } catch (err) {
      toast.error('Update failed');
      console.error(err);
    }
  }

  async function deleteTrigger(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('risk_triggers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Trigger deleted');
      fetchTriggers();
    } catch (err) {
      toast.error('Delete failed');
      console.error(err);
    }
  }

  return { triggers, loading, insertTrigger, updateTrigger, deleteTrigger };
}
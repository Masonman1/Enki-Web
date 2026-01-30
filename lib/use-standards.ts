// lib/use-standards.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Standard {
  id: string;
  standard_name: string;
  description: string;
  category: string;
  applicable_to: string[];
  created_at: string;
  updated_at: string;
  created_by: string; // uuid as string for display if needed
}

export function useStandards() {
  const supabase = useSupabase();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStandards = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('wp_standards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setStandards(data || []);
    } catch (err) {
      toast.error('Fetch standards failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStandards();
  }, [fetchStandards]);

  // Realtime subscription for auto-refresh on DB changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('wp_standards_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wp_standards' },
        (payload) => {
          console.log('Realtime change detected:', payload); // Optional debug
          fetchStandards();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, fetchStandards]);

  // UPDATED: Param now includes created_by (no longer omitted)
  async function insertStandard(newStandard: Omit<Standard, 'id' | 'created_at' | 'updated_at'>) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('wp_standards').insert(newStandard);
      if (error) throw error;
      toast.success('Standard added');
      fetchStandards();
    } catch (err) {
      toast.error('Insert failed');
      console.error(err);
    }
  }

  async function updateStandard(id: string, updates: Partial<Standard>) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('wp_standards').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Standard updated');
      fetchStandards();
    } catch (err) {
      toast.error('Update failed');
      console.error(err);
    }
  }

  async function deleteStandard(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('wp_standards').delete().eq('id', id);
      if (error) throw error;
      toast.success('Standard deleted');
      fetchStandards();
    } catch (err) {
      toast.error('Delete failed');
      console.error(err);
    }
  }

  return { standards, loading, insertStandard, updateStandard, deleteStandard, fetchStandards };
}
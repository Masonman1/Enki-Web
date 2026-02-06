// lib/use-standards.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner'; // NEW: Sonner for toasts

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

  async function insertStandard(newStandard: Partial<Standard>) {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('wp_standards').insert(newStandard);
      if (error) throw error;
      toast.success('Standard inserted');
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
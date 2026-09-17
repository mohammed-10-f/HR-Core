import { supabase } from '../lib/supabase';

export async function listRows(table, { select='*', order='created_at', ascending=false } = {}) {
  if (!supabase) throw new Error('قاعدة البيانات غير مهيأة');
  const { data, error } = await supabase.from(table).select(select).order(order, { ascending });
  if (error) throw error;
  return data || [];
}

export async function insertRow(table, payload) {
  if (!supabase) throw new Error('قاعدة البيانات غير مهيأة');
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, payload) {
  if (!supabase) throw new Error('قاعدة البيانات غير مهيأة');
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

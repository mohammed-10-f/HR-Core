import { supabase } from '../lib/supabase';

export const authService = {
  async signIn(email, password) {
    if (!supabase) throw new Error('لم يتم إعداد Supabase بعد');
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    if (supabase) return supabase.auth.signOut();
  },
  async getSession() {
    if (!supabase) return { data: { session: null } };
    return supabase.auth.getSession();
  },
  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
};

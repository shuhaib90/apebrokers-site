import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rcxpnlaldmzzmktrrhke.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeHBubGFsZG16em1rdHJyaGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTU4OTUsImV4cCI6MjEwMTQzMTg5NX0.yn-l_pEvLdVHczOKqi9DRjlyx64T7keTJ0GutFqfvD0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveApplicationToSupabase(data) {
  try {
    const { data: inserted, error } = await supabase
      .from('apebrokers_applications')
      .insert([
        {
          broker_id: data.brokerId,
          x_username: data.xUsername,
          wallet_address: data.walletAddress,
          status: 'UNDER_REVIEW',
        },
      ])
      .select();

    if (error) {
      console.warn('Supabase insert warning:', error);
      return { success: false, error };
    }
    return { success: true, data: inserted };
  } catch (err) {
    console.error('Supabase error:', err);
    return { success: false, error: err };
  }
}

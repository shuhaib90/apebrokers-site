import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rcxpnlaldmzzmktrrhke.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeHBubGFsZG16em1rdHJyaGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTU4OTUsImV4cCI6MjEwMTQzMTg5NX0.yn-l_pEvLdVHczOKqi9DRjlyx64T7keTJ0GutFqfvD0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function checkExistingApplication(xUsername, walletAddress) {
  try {
    const cleanUser = (xUsername || '').replace(/^@/, '').trim().toLowerCase();
    const cleanWallet = (walletAddress || '').trim().toLowerCase();

    if (!cleanUser && !cleanWallet) return { exists: false };

    const { data, error } = await supabase
      .from('apebrokers_applications')
      .select('*');

    if (error) {
      console.warn('Check existing application query error:', error);
      return { exists: false };
    }

    if (data && data.length > 0) {
      const matchUser = cleanUser
        ? data.find((app) => (app.x_username || '').replace(/^@/, '').trim().toLowerCase() === cleanUser)
        : null;

      const matchWallet = cleanWallet
        ? data.find((app) => (app.wallet_address || '').trim().toLowerCase() === cleanWallet)
        : null;

      if (matchUser || matchWallet) {
        return {
          exists: true,
          duplicateUser: !!matchUser,
          duplicateWallet: !!matchWallet,
          existingApp: matchUser || matchWallet,
        };
      }
    }

    return { exists: false };
  } catch (err) {
    console.error('Error checking duplicate application:', err);
    return { exists: false };
  }
}

export async function saveApplicationToSupabase(data) {
  try {
    // 1. Safety check for duplicate before insert
    const dupCheck = await checkExistingApplication(data.xUsername, data.walletAddress);
    if (dupCheck.exists) {
      return {
        success: false,
        isDuplicate: true,
        duplicateUser: dupCheck.duplicateUser,
        duplicateWallet: dupCheck.duplicateWallet,
        existingApp: dupCheck.existingApp,
      };
    }

    // 2. Perform insert
    const { data: inserted, error } = await supabase
      .from('apebrokers_applications')
      .insert([
        {
          broker_id: data.brokerId,
          x_username: data.xUsername,
          wallet_address: data.walletAddress,
          status: 'UNDER_REVIEW',
          comment_link: data.commentLink || null,
          proof_links: data.proofLinks || {},
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

export async function fetchActiveTasks() {
  try {
    const { data, error } = await supabase
      .from('apebrokers_tasks')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Supabase tasks fetch error:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error('Supabase tasks error:', err);
    return null;
  }
}

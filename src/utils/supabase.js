import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bmggdejtcwhjmxbennal.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZ2dkZWp0Y3doam14YmVubmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTgxNzksImV4cCI6MjEwMzI5NDE3OX0.UBX5tAVaZISE5lIF30ik7AXjP1ablL9PwXCaYGOKFB4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function checkExistingApplication(xUsername, walletAddress) {
  try {
    const cleanUser = (xUsername || '').replace(/^@/, '').trim().toLowerCase();
    const cleanWallet = (walletAddress || '').trim().toLowerCase();

    if (!cleanUser && !cleanWallet) return { exists: false };

    // Query only matching rows using database index with limit
    const filters = [];
    if (cleanWallet) filters.push(`wallet_address.ilike.${cleanWallet}`);
    if (cleanUser) filters.push(`x_username.ilike.%${cleanUser}%`);

    if (filters.length === 0) return { exists: false };

    const { data, error } = await supabase
      .from('apebrokers_applications')
      .select('id, broker_id, x_username, wallet_address, created_at, is_gtd, card_tier, gtd_art_id')
      .or(filters.join(','))
      .limit(5);

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

    // 2. Strict Cap Enforcement on GTD
    let isGtd = data.isGtd === true;
    let gtdArtId = data.gtdArtId || null;

    if (isGtd) {
      const gtdConfig = await fetchGtdConfig();
      if (!gtdConfig.enabled || gtdConfig.currentWinners >= gtdConfig.maxLimit) {
        isGtd = false;
        gtdArtId = null;
      }
    }

    const cardTier = isGtd ? 'GOLDEN_GTD' : 'STANDARD';

    const { data: inserted, error } = await supabase
      .from('apebrokers_applications')
      .insert([
        {
          broker_id: data.brokerId,
          x_username: (data.xUsername || '').trim(),
          wallet_address: (data.walletAddress || '').trim(),
          status: isGtd ? 'APPROVED' : 'UNDER_REVIEW',
          comment_link: data.commentLink || null,
          proof_links: data.proofLinks || {},
          is_gtd: isGtd,
          card_tier: cardTier,
          gtd_art_id: gtdArtId,
        },
      ])
      .select();

    if (error) {
      console.warn('Supabase insert warning:', error);
      return { success: false, error };
    }
    return { success: true, isGtd, cardTier, gtdArtId, data: inserted };
  } catch (err) {
    console.error('Supabase error:', err);
    return { success: false, error: err };
  }
}

export async function fetchGtdConfig() {
  try {
    const { data: configRow } = await supabase
      .from('apebrokers_settings')
      .select('value')
      .eq('key', 'gtd_config')
      .single();

    const config = configRow?.value || { enabled: true, win_rate_percent: 10, max_limit: 50 };

    // Count how many verified GTD winners currently exist
    const { count } = await supabase
      .from('apebrokers_applications')
      .select('*', { count: 'exact', head: true })
      .eq('is_gtd', true);

    return {
      enabled: config.enabled !== false,
      winRate: config.win_rate_percent ?? 10,
      maxLimit: config.max_limit ?? 50,
      currentWinners: count || 0,
    };
  } catch (err) {
    console.error('Error fetching GTD config:', err);
    return { enabled: true, winRate: 10, maxLimit: 50, currentWinners: 0 };
  }
}

export async function determineGtdWinner() {
  try {
    const gtdInfo = await fetchGtdConfig();
    if (!gtdInfo.enabled) return { isWinner: false };
    if (gtdInfo.currentWinners >= gtdInfo.maxLimit) return { isWinner: false };

    // Roll random number 1-100
    const roll = Math.floor(Math.random() * 100) + 1;
    const isWinner = roll <= gtdInfo.winRate;

    if (isWinner) {
      const gtdArtId = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      return {
        isWinner: true,
        gtdArtId,
        artUrl: `/nfts/gold_${gtdArtId}.png`,
      };
    }

    return { isWinner: false };
  } catch (err) {
    console.error('Error determining GTD winner:', err);
    return { isWinner: false };
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

export async function fetchCommunities() {
  try {
    const { data, error } = await supabase
      .from('apebrokers_communities')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase communities fetch error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase communities error:', err);
    return [];
  }
}

export async function claimCommunityGtdSpot(communityId, appData) {
  try {
    // 1. Fetch community and verify remaining spots
    const { data: comm, error: commErr } = await supabase
      .from('apebrokers_communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (commErr || !comm) {
      throw new Error('Partner project not found');
    }

    if (comm.claimed_spots >= comm.total_spots) {
      throw new Error('All allocated GTD spots for this partner community have been claimed!');
    }

    // 2. Generate GTD syndicate artwork and broker ID
    const gtdArtId = Math.floor(Math.random() * 3) + 1;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const brokerId = `#${randNum}`;

    const payload = {
      broker_id: brokerId,
      x_username: appData.xUsername.trim(),
      wallet_address: appData.walletAddress.toLowerCase().trim(),
      status: 'APPROVED',
      is_gtd: true,
      card_tier: 'GOLDEN_GTD',
      gtd_art_id: gtdArtId,
      comment_link: appData.commentLink || null,
      proof_links: appData.proofLinks || {},
      community_id: communityId,
      community_name: comm.name,
      is_community_claim: true,
    };

    // 3. Insert application as guaranteed GTD
    const { data: appResult, error: appErr } = await supabase
      .from('apebrokers_applications')
      .insert([payload])
      .select()
      .single();

    if (appErr) throw appErr;

    // 4. Increment claimed_spots in community
    await supabase
      .from('apebrokers_communities')
      .update({ claimed_spots: (comm.claimed_spots || 0) + 1 })
      .eq('id', communityId);

    return {
      success: true,
      data: appResult,
      gtdArtId,
      brokerId,
      communityName: comm.name,
    };
  } catch (err) {
    console.error('Error claiming community GTD spot:', err);
    throw err;
  }
}


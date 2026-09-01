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

export async function checkExistingPartnerClaim(xUsername, walletAddress) {
  try {
    const cleanUser = (xUsername || '').replace(/^@/, '').toLowerCase().trim();
    const cleanWallet = (walletAddress || '').toLowerCase().trim();

    if (!cleanUser && !cleanWallet) return null;

    const { data, error } = await supabase
      .from('apebrokers_applications')
      .select('id, x_username, wallet_address, community_name, broker_id, gtd_art_id, created_at, is_gtd, status')
      .or('is_community_claim.eq.true,is_partner_claim.eq.true');

    if (error || !data || data.length === 0) return null;

    const match = data.find((app) => {
      const w = (app.wallet_address || '').toLowerCase().trim();
      const u = (app.x_username || '').replace(/^@/, '').toLowerCase().trim();
      if (cleanWallet && w === cleanWallet) return true;
      if (cleanUser && u === cleanUser) return true;
      return false;
    });

    return match || null;
  } catch (err) {
    console.error('Error checking existing partner claim:', err);
    return null;
  }
}

export async function claimCommunityGtdSpot(communityId, appData) {
  try {
    const cleanUser = (appData.xUsername || '').trim().replace(/^@/, '');
    const cleanWallet = (appData.walletAddress || '').toLowerCase().trim();

    if (!cleanUser) throw new Error('Please enter your X username.');
    if (!cleanWallet) throw new Error('Please enter your wallet address.');

    // 1. Check if this wallet or X username has ALREADY claimed via ANY partner collection
    const existingClaim = await checkExistingPartnerClaim(cleanUser, cleanWallet);
    if (existingClaim) {
      const commText = existingClaim.community_name ? ` with "${existingClaim.community_name}"` : '';
      throw new Error(
        `This wallet or X handle has already claimed a GTD allocation${commText}! Limit: 1 GTD claim per wallet and X handle across all partner collections.`
      );
    }

    // 2. Fetch community and verify remaining spots
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

    // 3. Generate GTD syndicate artwork and broker ID
    const gtdArtId = Math.floor(Math.random() * 3) + 1;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const brokerId = `#${randNum}`;

    const payload = {
      broker_id: brokerId,
      x_username: `@${cleanUser}`,
      wallet_address: cleanWallet,
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

    // 4. Insert application as guaranteed GTD
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

export async function validateAndRedeemPromoCode(codeString, appData) {
  try {
    const cleanCode = (codeString || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Please enter a valid code.');

    const cleanUser = (appData.xUsername || '').trim().replace(/^@/, '');
    const cleanWallet = (appData.walletAddress || '').toLowerCase().trim();

    if (!cleanUser) throw new Error('Please enter your X username.');
    if (!cleanWallet) throw new Error('Please enter your wallet address.');

    // 1. Check if this wallet or X username has ALREADY claimed via ANY promo code
    const { data: existingClaims, error: checkErr } = await supabase
      .from('apebrokers_applications')
      .select('id, x_username, wallet_address, claimed_via_code')
      .eq('is_code_claim', true);

    if (!checkErr && existingClaims && existingClaims.length > 0) {
      const alreadyClaimed = existingClaims.some((app) => {
        const appWallet = (app.wallet_address || '').toLowerCase().trim();
        const appUser = (app.x_username || '').replace(/^@/, '').toLowerCase().trim();
        return appWallet === cleanWallet || appUser === cleanUser.toLowerCase();
      });

      if (alreadyClaimed) {
        throw new Error('This wallet or X handle has already claimed a GTD spot via a secret code! (Limit: 1 code claim per user)');
      }
    }

    // 2. Fetch promo code from DB
    const { data: promo, error: promoErr } = await supabase
      .from('apebrokers_promo_codes')
      .select('*')
      .ilike('code', cleanCode)
      .single();

    if (promoErr || !promo) {
      throw new Error('Invalid secret code. Please check your spelling.');
    }

    if (!promo.is_active) {
      throw new Error('This promo code is currently paused or inactive.');
    }

    if (promo.claimed_uses >= promo.max_uses) {
      throw new Error('This code has reached its maximum claim limit!');
    }

    // 3. Generate GTD syndicate artwork and broker ID
    const gtdArtId = Math.floor(Math.random() * 3) + 1;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const brokerId = `#${randNum}`;

    const payload = {
      broker_id: brokerId,
      x_username: `@${cleanUser}`,
      wallet_address: cleanWallet,
      status: 'APPROVED',
      is_gtd: true,
      card_tier: 'GOLDEN_GTD',
      gtd_art_id: gtdArtId,
      comment_link: appData.commentLink || null,
      proof_links: appData.proofLinks || {},
      claimed_via_code: promo.code,
      is_code_claim: true,
    };

    // 4. Insert application as guaranteed GTD
    const { data: appResult, error: appErr } = await supabase
      .from('apebrokers_applications')
      .insert([payload])
      .select()
      .single();

    if (appErr) throw appErr;

    // 5. Increment claimed_uses
    await supabase
      .from('apebrokers_promo_codes')
      .update({ claimed_uses: (promo.claimed_uses || 0) + 1 })
      .eq('id', promo.id);

    return {
      success: true,
      data: appResult,
      gtdArtId,
      brokerId,
      codeName: promo.code,
      campaignTag: promo.campaign_tag,
    };
  } catch (err) {
    console.error('Error redeeming promo code:', err);
    throw err;
  }
}

/**
 * Lookup application for pre-mint on-chain verification
 * Only registered applicants (Standard form, Code claims, or Form GTD winners) can verify
 */
export async function lookupApplicationForVerification(xUsername, walletAddress) {
  try {
    const cleanUser = (xUsername || '').replace(/^@/, '').trim().toLowerCase();
    const cleanWallet = (walletAddress || '').trim().toLowerCase();

    if (!cleanUser || !cleanWallet) {
      return { found: false, error: 'Please connect both your X account and Web3 wallet to verify.' };
    }

    // Query for application matching either or both
    const { data, error } = await supabase
      .from('apebrokers_applications')
      .select('*')
      .or(`wallet_address.ilike.${cleanWallet},x_username.ilike.%${cleanUser}%`)
      .limit(10);

    if (error) {
      console.warn('Error querying application for verification:', error);
      return { found: false, error: 'Database query failed. Please try again.' };
    }

    if (!data || data.length === 0) {
      return {
        found: false,
        error: `No registered application found for @${cleanUser} and ${cleanWallet.substring(0, 6)}...${cleanWallet.substring(cleanWallet.length - 4)}. Please submit an application on /apply first.`,
      };
    }

    // Strict Match: Both wallet and X username must match the exact same application
    const exactMatch = data.find((app) => {
      const appWallet = (app.wallet_address || '').toLowerCase().trim();
      const appUser = (app.x_username || '').replace(/^@/, '').toLowerCase().trim();
      return appWallet === cleanWallet && appUser === cleanUser;
    });

    if (exactMatch) {
      return {
        found: true,
        application: exactMatch,
      };
    }

    // Check specific mismatch reasons to give clear feedback
    const walletMatch = data.find((app) => (app.wallet_address || '').toLowerCase().trim() === cleanWallet);
    const userMatch = data.find((app) => (app.x_username || '').replace(/^@/, '').toLowerCase().trim() === cleanUser);

    if (walletMatch && !userMatch) {
      return {
        found: false,
        error: `Connected wallet is registered under a different X handle (@${walletMatch.x_username}). Both the X account and wallet must match the application you submitted.`,
      };
    }

    if (userMatch && !walletMatch) {
      const w = userMatch.wallet_address || '';
      const maskedW = w.length > 10 ? `${w.substring(0, 6)}...${w.substring(w.length - 4)}` : w;
      return {
        found: false,
        error: `X account @${cleanUser} is registered with a different wallet (${maskedW}). Please connect the wallet you used to apply.`,
      };
    }

    return {
      found: false,
      error: 'X account and wallet do not match any single registered application record.',
    };
  } catch (err) {
    console.error('Error looking up application:', err);
    return { found: false, error: err.message || 'Lookup failed.' };
  }
}

/**
 * Verifies on-chain activity and clears applicant for Mint Day
 * - Existing GTD winners / Secret Code claimers: Directly assigned GTD Mint Tier
 * - Standard Form Applicants: Assigned GTD (cap: 3,000) or FCFS (cap: 2,000)
 */
export async function verifyAndClearForMint(applicationId, { xUsername, walletAddress, chainActivity }) {
  try {
    const GTD_CAP = 2000;
    const FCFS_CAP = 3000;

    // 1. Fetch current application record
    const { data: app, error: appErr } = await supabase
      .from('apebrokers_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appErr || !app) {
      throw new Error('Application record not found.');
    }

    // 2. Check for duplicate verification security attempt
    const cleanWallet = (walletAddress || app.wallet_address || '').trim().toLowerCase();
    const cleanUser = (xUsername || app.x_username || '').replace(/^@/, '').trim().toLowerCase();

    // Check if this wallet or user is already verified in ANY row
    const { data: existingVerified } = await supabase
      .from('apebrokers_applications')
      .select('id, broker_id, mint_tier, is_gtd, gtd_art_id, mint_verified_at, chain_activity')
      .eq('is_mint_verified', true)
      .or(`wallet_address.ilike.${cleanWallet},x_username.ilike.%${cleanUser}%`)
      .limit(2);

    const alreadyVerifiedMatch = existingVerified && existingVerified.length > 0 ? existingVerified[0] : null;

    if (app.is_mint_verified || (alreadyVerifiedMatch && alreadyVerifiedMatch.id !== app.id)) {
      // Mark duplicate attempt in database for security audit log
      await supabase
        .from('apebrokers_applications')
        .update({
          notes: `${app.notes || ''} [DUPLICATE_VERIFY_LOGGED: ${new Date().toISOString()}]`.trim(),
        })
        .eq('id', app.id);

      const targetApp = alreadyVerifiedMatch || app;
      return {
        success: true,
        isDuplicate: true,
        alreadyVerified: true,
        application: targetApp,
        brokerId: targetApp.broker_id || `#${targetApp.id}`,
        mintTier: targetApp.mint_tier || (targetApp.is_gtd ? 'GTD' : 'FCFS'),
        isGtd: targetApp.mint_tier === 'GTD' || targetApp.is_gtd,
        gtdArtId: targetApp.gtd_art_id || 1,
        verifiedAt: targetApp.mint_verified_at || new Date().toISOString(),
        chainActivity: targetApp.chain_activity || chainActivity || {},
      };
    }

    // 3. Fetch live verification counts to respect caps
    const { data: verifiedRows } = await supabase
      .from('apebrokers_applications')
      .select('id, mint_tier, is_gtd')
      .eq('is_mint_verified', true);

    const verifiedGtdCount = verifiedRows ? verifiedRows.filter((r) => r.mint_tier === 'GTD' || r.is_gtd).length : 0;
    const verifiedFcfsCount = verifiedRows ? verifiedRows.filter((r) => r.mint_tier === 'FCFS').length : 0;

    // 4. Resolve allocation tier based on multi-chain holding & transactions
    const rhBal = Number(chainActivity?.robinhoodBalance || 0);
    const totalEthBal = Number(chainActivity?.totalEthBalance || rhBal);
    const estimatedUsd = Number(chainActivity?.estimatedUsdBalance || totalEthBal * 2800);
    const rhTx = Number(chainActivity?.robinhoodTxCount || 0);
    const totalTx = Number(chainActivity?.totalEvmTxns || rhTx);

    // Rule A: Minimum $10 equivalent (~0.0035 ETH) on Robinhood Chain or any EVM chain
    const holdsMin10Dollars = estimatedUsd >= 10 || totalEthBal >= 0.0035 || rhBal >= 0.0035;

    // Rule B: $1 to $2 equivalent (~0.00035 ETH) for existing GTD / Code winners
    const holds1to2Dollars = estimatedUsd >= 1 || totalEthBal >= 0.00035 || rhBal >= 0.00035;

    let assignedTier = 'INELIGIBLE';
    let isGtdWinner = false;

    const isExistingGtdClaimer = app.is_gtd || app.is_code_claim || app.is_partner_claim || app.card_tier === 'GOLDEN_GTD';

    if (isExistingGtdClaimer) {
      // Existing GTD Winner (General WL GTD winner or Secret Code winner):
      // Eligible for GTD if they hold $1 to $2 OR have at least 1 transaction
      if (holds1to2Dollars || totalTx >= 1) {
        assignedTier = 'GTD';
        isGtdWinner = true;
      } else {
        assignedTier = 'INELIGIBLE';
        isGtdWinner = false;
      }
    } else {
      // Standard WL User:
      // 1. If holding minimum $10 on Robinhood Chain or any other chain -> Eligible for GTD
      if (holdsMin10Dollars) {
        if (verifiedGtdCount < GTD_CAP) {
          assignedTier = 'GTD';
          isGtdWinner = true;
        } else if (verifiedFcfsCount < FCFS_CAP) {
          assignedTier = 'FCFS';
        } else {
          assignedTier = 'INELIGIBLE';
        }
      }
      // 2. If holding under $10, eligible for FCFS if they have a good tx count (or small balance)
      else if (totalTx >= 1 || holds1to2Dollars || estimatedUsd > 0) {
        if (verifiedFcfsCount < FCFS_CAP) {
          assignedTier = 'FCFS';
          isGtdWinner = false;
        } else {
          assignedTier = 'INELIGIBLE';
        }
      }
      // 3. Otherwise: $0 balance and 0 transactions -> INELIGIBLE
      else {
        assignedTier = 'INELIGIBLE';
        isGtdWinner = false;
      }
    }

    const verifiedAt = new Date().toISOString();
    const updatedProofLinks = {
      ...(app.proof_links || {}),
      is_mint_verified: true,
      mint_tier: assignedTier,
      mint_verified_at: verifiedAt,
      chain_activity: chainActivity || {},
    };

    // 5. Update application with verified mint clearance (permanently locked)
    const { data: updatedApp, error: updateErr } = await supabase
      .from('apebrokers_applications')
      .update({
        is_mint_verified: true,
        mint_tier: assignedTier,
        is_gtd: isGtdWinner || app.is_gtd,
        card_tier: isGtdWinner ? 'GOLDEN_GTD' : (assignedTier === 'INELIGIBLE' ? 'INELIGIBLE' : (app.card_tier || 'CYBER_STANDARD')),
        gtd_art_id: gtdArtId,
        mint_verified_at: verifiedAt,
        chain_activity: chainActivity || {},
        proof_links: updatedProofLinks,
        status: assignedTier === 'INELIGIBLE' ? 'INELIGIBLE' : 'APPROVED',
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) {
      console.warn('Update mint clearance note:', updateErr);
    }

    return {
      success: true,
      application: updatedApp || app,
      brokerId: app.broker_id || `#${app.id}`,
      mintTier: assignedTier,
      isGtd: isGtdWinner,
      gtdArtId,
      verifiedAt,
      chainActivity,
    };
  } catch (err) {
    console.error('Error verifying user for mint:', err);
    throw err;
  }
}

/**
 * Fetch total live mint verification statistics
 */
export async function fetchMintVerificationStats() {
  try {
    const { data, error } = await supabase
      .from('apebrokers_applications')
      .select('id, is_mint_verified, mint_tier, is_gtd, is_partner_claim, is_code_claim');

    if (error || !data) return { totalVerified: 0, gtdCount: 0, fcfsCount: 0, partnerCount: 0 };

    const totalVerified = data.filter((a) => a.is_mint_verified).length;
    const gtdCount = data.filter((a) => a.is_mint_verified && (a.mint_tier === 'GTD' || a.is_gtd)).length;
    const fcfsCount = data.filter((a) => a.is_mint_verified && a.mint_tier === 'FCFS').length;
    const partnerCount = data.filter((a) => a.is_partner_claim || !!a.community_name).length;

    return {
      totalVerified,
      gtdCount,
      fcfsCount,
      partnerCount,
    };
  } catch (err) {
    return { totalVerified: 0, gtdCount: 0, fcfsCount: 0, partnerCount: 0 };
  }
}

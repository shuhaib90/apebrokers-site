import { supabase } from './supabase';

/**
 * Ape Broker Desk — Supabase Data Layer & Off-chain Indexer Helper
 * Note: Blockchain contract state is always the authoritative source of truth.
 * Supabase functions provide an indexing cache, live event feeds, and rapid UI retrieval.
 */

/**
 * Fetch all desks owned by a wallet address from Supabase
 */
export async function fetchUserDesksFromDb(ownerAddress) {
  if (!ownerAddress) return [];
  try {
    const { data, error } = await supabase
      .from('apebroker_desks')
      .select('*')
      .ilike('owner', ownerAddress.toLowerCase().trim())
      .order('token_id', { ascending: true });

    if (error) {
      console.warn('Supabase fetchUserDesks error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching user desks from DB:', err);
    return [];
  }
}

/**
 * Fetch a single desk by token ID
 */
export async function fetchDeskByIdFromDb(tokenId) {
  if (tokenId === undefined || tokenId === null) return null;
  try {
    const { data, error } = await supabase
      .from('apebroker_desks')
      .select('*')
      .eq('token_id', Number(tokenId))
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchDeskById error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error fetching desk by ID from DB:', err);
    return null;
  }
}

/**
 * Upsert Desk state (active, boost_count, weights, owner)
 */
export async function syncDeskToDb({
  tokenId,
  owner,
  active = true,
  boostCount = 0,
  baseWeight = 100,
  currentWeight = 100,
}) {
  if (tokenId === undefined || tokenId === null) return null;
  try {
    const payload = {
      token_id: Number(tokenId),
      owner: (owner || '').toLowerCase().trim(),
      active: Boolean(active),
      boost_count: Number(boostCount),
      base_weight: Number(baseWeight),
      current_weight: Number(currentWeight),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('apebroker_desks')
      .upsert(payload, { onConflict: 'token_id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase syncDesk warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error syncing desk to DB:', err);
    return null;
  }
}

/**
 * Record a Desk Boost event
 */
export async function recordDeskBoostInDb({
  tokenId,
  owner,
  boostNumber,
  cost,
  weightBefore,
  weightAfter,
  txHash,
  blockNumber,
}) {
  try {
    const { data, error } = await supabase
      .from('apebroker_desk_boosts')
      .insert({
        token_id: Number(tokenId),
        owner: (owner || '').toLowerCase().trim(),
        boost_number: Number(boostNumber),
        cost: String(cost),
        weight_before: Number(weightBefore),
        weight_after: Number(weightAfter),
        tx_hash: txHash || '',
        block_number: blockNumber ? Number(blockNumber) : null,
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase recordDeskBoost warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error recording desk boost in DB:', err);
    return null;
  }
}

/**
 * Record an Admin Native ETH Reward Deposit
 */
export async function recordRewardDepositInDb({
  depositor,
  amountEth,
  epoch,
  txHash,
  blockNumber,
}) {
  try {
    const { data, error } = await supabase
      .from('apebroker_reward_deposits')
      .insert({
        depositor: (depositor || '').toLowerCase().trim(),
        amount_eth: String(amountEth),
        epoch: Number(epoch),
        tx_hash: txHash || '',
        block_number: blockNumber ? Number(blockNumber) : null,
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase recordRewardDeposit warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error recording reward deposit in DB:', err);
    return null;
  }
}

/**
 * Record an ETH Reward Claim
 */
export async function recordRewardClaimInDb({
  tokenId,
  claimer,
  amountEth,
  claimType = 'single',
  txHash,
  blockNumber,
}) {
  try {
    const { data, error } = await supabase
      .from('apebroker_reward_claims')
      .insert({
        token_id: tokenId !== null && tokenId !== undefined ? Number(tokenId) : null,
        claimer: (claimer || '').toLowerCase().trim(),
        amount_eth: String(amountEth),
        claim_type: claimType,
        tx_hash: txHash || '',
        block_number: blockNumber ? Number(blockNumber) : null,
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase recordRewardClaim warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error recording reward claim in DB:', err);
    return null;
  }
}

/**
 * Record Admin Protocol Fee Claim ($APEBROKE to Treasury)
 */
export async function recordProtocolFeeClaimInDb({
  treasury,
  amountApebroke,
  txHash,
}) {
  try {
    const { data, error } = await supabase
      .from('apebroker_protocol_fee_claims')
      .insert({
        treasury: (treasury || '').toLowerCase().trim(),
        amount_apebroke: String(amountApebroke),
        tx_hash: txHash || '',
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase recordProtocolFeeClaim warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error recording protocol fee claim in DB:', err);
    return null;
  }
}

/**
 * Fetch recent activity feed (boosts, deposits, claims)
 */
export async function fetchRecentProtocolActivity(limit = 15) {
  try {
    const [boostsRes, depositsRes, claimsRes] = await Promise.all([
      supabase
        .from('apebroker_desk_boosts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('apebroker_reward_deposits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('apebroker_reward_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const items = [];

    (boostsRes.data || []).forEach((b) => {
      items.push({
        type: 'boost',
        id: `boost-${b.id}`,
        tokenId: b.token_id,
        user: b.owner,
        detail: `Boost #${b.boost_number} (+100 WGT)`,
        cost: b.cost,
        txHash: b.tx_hash,
        timestamp: b.created_at,
      });
    });

    (depositsRes.data || []).forEach((d) => {
      items.push({
        type: 'deposit',
        id: `deposit-${d.id}`,
        user: d.depositor,
        detail: `Admin ETH Deposit: ${d.amount_eth} ETH (Epoch ${d.epoch})`,
        txHash: d.tx_hash,
        timestamp: d.created_at,
      });
    });

    (claimsRes.data || []).forEach((c) => {
      items.push({
        type: 'claim',
        id: `claim-${c.id}`,
        tokenId: c.token_id,
        user: c.claimer,
        detail: `Reward Claim: ${c.amount_eth} ETH (${c.claim_type})`,
        txHash: c.tx_hash,
        timestamp: c.created_at,
      });
    });

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return items.slice(0, limit);
  } catch (err) {
    console.error('Error fetching protocol activity:', err);
    return [];
  }
}

/**
 * Twitter / X Task & Link Verification Utilities (100% Free - No API Key Required)
 */

// Twitter Snowflake Epoch (Nov 04, 2010 01:42:54.657 UTC in ms)
const TWITTER_EPOCH = 1288834974657n;

// Whitelist Campaign Start Timestamp (Aug 20, 2026)
const CAMPAIGN_START_MS = 1787184000000; // Aug 20, 2026

/**
 * Extracts timestamp (ms) from a Twitter Snowflake ID
 */
export function getTweetTimestamp(statusIdStr) {
  try {
    const idBigInt = BigInt(statusIdStr);
    const timestampMs = Number((idBigInt >> 22n) + TWITTER_EPOCH);
    return timestampMs;
  } catch (err) {
    return null;
  }
}

/**
 * Validates whether a comment / proof URL is a well-formed, authentic X tweet
 */
export function validateTweetUrlFormat(url, expectedUsername) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Please enter a valid X link' };
  }

  const cleanUrl = url.trim();

  // Must match x.com or twitter.com status URL
  const match = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,30})\/status\/(\d+)/i);
  if (!match) {
    return {
      valid: false,
      error: 'Invalid URL format. Must be https://x.com/username/status/123456...',
    };
  }

  const urlUser = match[1].toLowerCase();
  const statusId = match[2];

  // Check 1: Status ID length (modern snowflake IDs are 18-19 digits)
  if (statusId.length < 18) {
    return {
      valid: false,
      error: 'Fake Tweet ID detected. Please paste your real comment link.',
    };
  }

  // Check 2: Snowflake timestamp check (ensure tweet was posted recently during campaign)
  const tweetDateMs = getTweetTimestamp(statusId);
  const now = Date.now();

  // Allow tweets created in 2026 within a realistic timeframe
  if (tweetDateMs && (tweetDateMs > now + 3600000 || tweetDateMs < 1700000000000)) {
    return {
      valid: false,
      error: 'Tweet timestamp is invalid or too old for this whitelist campaign.',
    };
  }

  // Check 3: Username match check (if user is not 'i' or 'Apesyndicates')
  if (expectedUsername) {
    const cleanExpected = expectedUsername.replace(/^@/, '').trim().toLowerCase();
    if (
      urlUser !== 'i' &&
      urlUser !== 'apesyndicates' &&
      urlUser !== 'apebrokersnft' &&
      urlUser !== cleanExpected
    ) {
      return {
        valid: false,
        error: `Link username (@${match[1]}) does not match your entered X handle (@${cleanExpected}).`,
      };
    }
  }

  return {
    valid: true,
    statusId,
    username: match[1],
    timestamp: tweetDateMs ? new Date(tweetDateMs).toISOString() : null,
  };
}

/**
 * Check if tweet is live on X via Twitter's free public oEmbed
 */
export async function verifyTweetLive(url) {
  try {
    const clean = url.trim().replace('x.com', 'twitter.com').split('?')[0];
    const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(clean)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const json = await res.json();
      return { live: true, author: json.author_name };
    }

    if (res.status === 404) {
      return { live: false, error: 'Tweet does not exist on X (404 Not Found)' };
    }

    return { live: true }; // Permissive on network/cors edge cases
  } catch (err) {
    // If CORS or timeout in client browser, rely on snowflake format validation
    return { live: true };
  }
}

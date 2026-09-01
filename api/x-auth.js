// Vercel Serverless Function for Twitter OAuth 2.0 Token Exchange & User Profile Fetch

const X_CLIENT_ID = process.env.X_CLIENT_ID || 'OHBSa2lOSVoxN0RuS1BpdUFDYW06MTpjaQ';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || 'd4BUJHuHIsXe9BiWesdSKBxbTVOjAxW6HuU7Xd9Wsf0j-9i9Mg';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { code, verifier, redirectUri } = req.method === 'POST' ? req.body : req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing OAuth authorization code' });
    }

    const authHeader = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');

    const params = new URLSearchParams({
      code: code,
      grant_type: 'authorization_code',
      client_id: X_CLIENT_ID,
      redirect_uri: redirectUri || 'https://apesyndicates.xyz/verify',
      code_verifier: verifier || 'challenge',
    });

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Twitter token exchange failed:', tokenData);
      return res.status(400).json({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange Twitter OAuth token',
        details: tokenData,
      });
    }

    // 2. Fetch authenticated user's profile (/2/users/me)
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.data) {
      console.error('Twitter user fetch failed:', userData);
      return res.status(400).json({
        error: 'Failed to fetch Twitter user profile',
        details: userData,
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userData.data.id,
        username: userData.data.username,
        name: userData.data.name,
        profileImageUrl: userData.data.profile_image_url,
      },
    });
  } catch (error) {
    console.error('Twitter OAuth Handler Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

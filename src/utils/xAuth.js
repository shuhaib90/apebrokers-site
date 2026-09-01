// Native X (Twitter) OAuth 2.0 PKCE & Profile Helper

const X_CLIENT_ID = 'OHBSa2lOSVoxN0RuS1BpdUFDYW06MTpjaQ';

// Generate a random string for state/code_verifier
function generateRandomString(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

// SHA-256 base64url encoding for PKCE
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates native Twitter OAuth 2.0 flow
 */
export async function startTwitterOAuth() {
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem('x_oauth_state', state);
  sessionStorage.setItem('x_oauth_verifier', codeVerifier);
  sessionStorage.setItem('x_oauth_redirect_uri', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: X_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'users.read tweet.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Checks URL on page load for OAuth callback parameters
 */
export function checkTwitterOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');

  if (error) {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: false, error: `Twitter Auth Error: ${error}` };
  }

  if (code && state) {
    const savedState = sessionStorage.getItem('x_oauth_state');
    const savedVerifier = sessionStorage.getItem('x_oauth_verifier');

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    if (savedState && state !== savedState) {
      return { success: false, error: 'State mismatch error. Please try again.' };
    }

    return {
      success: true,
      code,
      verifier: savedVerifier,
    };
  }

  return null;
}

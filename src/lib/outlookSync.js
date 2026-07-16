import { supabase } from './supabase';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CLIENT_ID = process.env.REACT_APP_OUTLOOK_CLIENT_ID;
const REDIRECT_URI = window.location.origin;

// ── PKCE helpers ──
function generateVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── Auth URL — PKCE flow ──
export async function getOutlookAuthUrl() {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  sessionStorage.setItem('pkce_verifier', verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email offline_access Calendars.Read',
    state: 'outlook_auth',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

// ── Parse code from URL after redirect (PKCE returns ?code= not #token) ──
export function parseCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (code && state === 'outlook_auth') return code;
  // Fallback: also check hash for legacy implicit flow tokens
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const token = hash.get('access_token');
  if (token && hash.get('state') === 'outlook_auth') return null; // handled below
  return null;
}

// Legacy: parse implicit flow token from hash (fallback)
export function parseTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');
  if (accessToken && state === 'outlook_auth') {
    return { access_token: accessToken, expires_in: parseInt(expiresIn || '3600') };
  }
  return null;
}

// ── Exchange code for tokens ──
export async function exchangeCodeForTokens(code) {
  const verifier = sessionStorage.getItem('pkce_verifier');
  if (!verifier) return null;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    sessionStorage.removeItem('pkce_verifier');
    return data;
  } catch (e) {
    console.error('Token exchange failed:', e);
    return null;
  }
}

// ── Silently refresh using refresh token ──
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('outlook_refresh_token');
  if (!refreshToken) return null;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'Calendars.Read offline_access',
  });
  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    saveTokens(data);
    return data.access_token;
  } catch (e) {
    console.error('Token refresh failed:', e);
    return null;
  }
}

// ── Token storage ──
export function saveTokens(tokens) {
  const expiresAt = Date.now() + ((tokens.expires_in || 3600) * 1000);
  localStorage.setItem('outlook_access_token', tokens.access_token);
  localStorage.setItem('outlook_token_expires_at', String(expiresAt));
  if (tokens.refresh_token) {
    localStorage.setItem('outlook_refresh_token', tokens.refresh_token);
  }
}

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem('outlook_access_token'),
    refreshToken: localStorage.getItem('outlook_refresh_token'),
    expiresAt: parseInt(localStorage.getItem('outlook_token_expires_at') || '0'),
  };
}

export function clearTokens() {
  localStorage.removeItem('outlook_access_token');
  localStorage.removeItem('outlook_token_expires_at');
  localStorage.removeItem('outlook_refresh_token');
}

export function isOutlookConnected() {
  const { accessToken, refreshToken, expiresAt } = getStoredTokens();
  // Connected if token valid OR we have a refresh token to get a new one
  return !!accessToken && (Date.now() < expiresAt || !!refreshToken);
}

export async function getValidAccessToken() {
  const { accessToken, expiresAt } = getStoredTokens();
  if (!accessToken) return null;
  // Token still valid
  if (Date.now() < expiresAt - 60 * 1000) return accessToken;
  // Token expired — try to refresh silently
  return await refreshAccessToken();
}

export function getTokenExpiryMinutes() {
  const { expiresAt } = getStoredTokens();
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
}

// ── Fetch and sync ──
async function fetchFromGraph(accessToken, startDate, endDate) {
  const params = new URLSearchParams({
    startDateTime: startDate + 'T00:00:00Z',
    endDateTime: endDate + 'T23:59:59Z',
    $select: 'id,subject,start,end,isAllDay,bodyPreview,responseStatus,attendees,isOnlineMeeting',
    $orderby: 'start/dateTime',
    $top: '500',
  });
  const res = await fetch(`${GRAPH_BASE}/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.value || [];
}

export async function syncOutlookToSupabase(accessToken) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().slice(0, 10);
  const events = await fetchFromGraph(accessToken, start, end);
  if (!events) return false;
  const rows = events.map(ev => ({
    outlook_id: ev.id,
    subject: ev.subject || '(No title)',
    start_date: ev.isAllDay ? ev.start.date : ev.start.dateTime?.slice(0, 10),
    start_time: ev.isAllDay ? null : ev.start.dateTime?.slice(11, 16),
    is_all_day: ev.isAllDay || false,
    has_attendees: (ev.attendees && ev.attendees.length > 0) || false,
    is_online_meeting: ev.isOnlineMeeting || false,
    response_status: ev.responseStatus?.response || 'none',
    body_preview: ev.bodyPreview || null,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await supabase.from('outlook_events').upsert(batch, { onConflict: 'outlook_id' });
  }
  localStorage.setItem('outlook_last_sync', String(Date.now()));
  return true;
}

export function shouldSync() {
  const last = parseInt(localStorage.getItem('outlook_last_sync') || '0');
  return Date.now() - last > 60 * 60 * 1000;
}

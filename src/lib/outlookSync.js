import { supabase } from './supabase';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CLIENT_ID = process.env.REACT_APP_OUTLOOK_CLIENT_ID;
const REDIRECT_URI = window.location.origin;

export function getOutlookAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email Calendars.Read',
    state: 'outlook_auth',
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

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

export function saveTokens(tokens) {
  const expiresAt = Date.now() + (tokens.expires_in * 1000);
  localStorage.setItem('outlook_access_token', tokens.access_token);
  localStorage.setItem('outlook_token_expires_at', String(expiresAt));
}

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem('outlook_access_token'),
    expiresAt: parseInt(localStorage.getItem('outlook_token_expires_at') || '0'),
  };
}

export function clearTokens() {
  localStorage.removeItem('outlook_access_token');
  localStorage.removeItem('outlook_token_expires_at');
}

export function isOutlookConnected() {
  const { accessToken, expiresAt } = getStoredTokens();
  return !!accessToken && Date.now() < expiresAt;
}

export async function getValidAccessToken() {
  const { accessToken, expiresAt } = getStoredTokens();
  if (!accessToken) return null;
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    clearTokens();
    return null;
  }
  return accessToken;
}

// Fetch events from Microsoft Graph
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

// Sync Outlook events to Supabase — fetches 3 months back and 3 months forward
export async function syncOutlookToSupabase(accessToken) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().slice(0, 10);

  const events = await fetchFromGraph(accessToken, start, end);
  if (!events) return false;

  // Upsert all events into Supabase
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

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await supabase.from('outlook_events').upsert(batch, { onConflict: 'outlook_id' });
  }

  // Save last sync time
  localStorage.setItem('outlook_last_sync', String(Date.now()));
  return true;
}

// Check if we should sync (hasn't synced in the last hour)
export function shouldSync() {
  const last = parseInt(localStorage.getItem('outlook_last_sync') || '0');
  return Date.now() - last > 60 * 60 * 1000; // 1 hour
}

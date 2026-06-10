const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CLIENT_ID = process.env.REACT_APP_OUTLOOK_CLIENT_ID;
const TENANT_ID = process.env.REACT_APP_OUTLOOK_TENANT_ID;
const REDIRECT_URI = window.location.origin;

export function getOutlookAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile email Calendars.Read offline_access',
    state: 'outlook_auth',
  });
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email Calendars.Read offline_access',
  });
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'openid profile email Calendars.Read offline_access',
  });
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return res.json();
}

export async function fetchOutlookEvents(accessToken, startDate, endDate) {
  const params = new URLSearchParams({
    startDateTime: startDate + 'T00:00:00Z',
    endDateTime: endDate + 'T23:59:59Z',
    $select: 'subject,start,end,isAllDay,bodyPreview,responseStatus,attendees,isOnlineMeeting',
    $orderby: 'start/dateTime',
    $top: '100',
  });
  const res = await fetch(`${GRAPH_BASE}/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.value || [];
}

export function saveTokens(tokens) {
  const expiresAt = Date.now() + (tokens.expires_in * 1000);
  localStorage.setItem('outlook_access_token', tokens.access_token);
  localStorage.setItem('outlook_refresh_token', tokens.refresh_token);
  localStorage.setItem('outlook_token_expires_at', String(expiresAt));
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
  localStorage.removeItem('outlook_refresh_token');
  localStorage.removeItem('outlook_token_expires_at');
}

export function isOutlookConnected() {
  return !!localStorage.getItem('outlook_access_token');
}

export async function getValidAccessToken() {
  const { accessToken, refreshToken, expiresAt } = getStoredTokens();
  if (!accessToken) return null;
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    if (!refreshToken) return null;
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens.access_token) { saveTokens(newTokens); return newTokens.access_token; }
    return null;
  }
  return accessToken;
}

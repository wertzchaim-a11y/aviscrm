const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const CLIENT_ID = process.env.REACT_APP_OUTLOOK_CLIENT_ID;
const REDIRECT_URI = window.location.origin;

// Use implicit flow — token comes back directly in URL hash
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

// Parse token from URL hash after redirect
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
  // Token expired — need to re-authenticate
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    clearTokens();
    return null;
  }
  return accessToken;
}

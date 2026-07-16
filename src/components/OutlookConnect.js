import React, { useState, useEffect } from 'react';
import { getOutlookAuthUrl, isOutlookConnected, clearTokens, parseTokenFromHash, parseCodeFromUrl, exchangeCodeForTokens, saveTokens, getTokenExpiryMinutes } from '../lib/outlookSync';

export default function OutlookConnect({ onConnected }) {
  const [connected, setConnected] = useState(isOutlookConnected());
  const [loading, setLoading] = useState(false);
  const [minsLeft, setMinsLeft] = useState(getTokenExpiryMinutes());

  // On load: handle redirect back from Microsoft (PKCE code or legacy token)
  useEffect(() => {
    const handleRedirect = async () => {
      // PKCE flow: code in query string
      const code = parseCodeFromUrl();
      if (code) {
        setLoading(true);
        const tokens = await exchangeCodeForTokens(code);
        if (tokens) {
          saveTokens(tokens);
          setConnected(true);
          setMinsLeft(getTokenExpiryMinutes());
          onConnected && onConnected();
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setLoading(false);
        return;
      }
      // Legacy implicit flow: token in hash
      const legacyTokens = parseTokenFromHash();
      if (legacyTokens) {
        setLoading(true);
        saveTokens(legacyTokens);
        setConnected(true);
        setMinsLeft(getTokenExpiryMinutes());
        onConnected && onConnected();
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoading(false);
      }
    };
    handleRedirect();
  }, []);

  // Check token expiry every minute — auto-refreshes silently if refresh token exists
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const mins = getTokenExpiryMinutes();
      setMinsLeft(mins);
      if (mins <= 0 && !isOutlookConnected()) {
        clearTokens();
        setConnected(false);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleConnect = async () => {
    const url = await getOutlookAuthUrl();
    window.location.href = url;
  };

  const handleDisconnect = () => {
    clearTokens();
    setConnected(false);
  };

  if (loading) return (
    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Connecting...</span>
  );

  if (connected) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: minsLeft <= 10 && minsLeft > 0 ? 'var(--red)' : 'var(--green)', fontWeight: '500' }}>
        Outlook {minsLeft <= 10 && minsLeft > 0 ? `(${minsLeft}m left)` : 'connected'}
      </span>
      {minsLeft <= 10 && minsLeft > 0 && (
        <button className="btn btn-sm" style={{ fontSize: '11px' }} onClick={handleConnect}>Reconnect</button>
      )}
      <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--text-3)' }} onClick={handleDisconnect}>Disconnect</button>
    </div>
  );

  return (
    <button className="btn btn-sm" onClick={handleConnect}>
      Connect Outlook
    </button>
  );
}

import React, { useState, useEffect } from 'react';
import { getOutlookAuthUrl, isOutlookConnected, clearTokens, parseTokenFromHash, saveTokens, getTokenExpiryMinutes } from '../lib/outlookSync';

export default function OutlookConnect({ onConnected }) {
  const [connected, setConnected] = useState(isOutlookConnected());
  const [loading, setLoading] = useState(false);
  const [minsLeft, setMinsLeft] = useState(getTokenExpiryMinutes());

  // On load, check if Microsoft redirected back with a token in the URL hash
  useEffect(() => {
    const tokens = parseTokenFromHash();
    if (tokens) {
      setLoading(true);
      saveTokens(tokens);
      setConnected(true);
      setMinsLeft(getTokenExpiryMinutes());
      onConnected && onConnected();
      setLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check token expiry every minute
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const mins = getTokenExpiryMinutes();
      setMinsLeft(mins);
      if (mins <= 0) {
        clearTokens();
        setConnected(false);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleConnect = () => {
    window.location.href = getOutlookAuthUrl();
  };

  const handleDisconnect = () => {
    clearTokens();
    setConnected(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-3)' }}>
      <div style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%' }} />
      Connecting…
    </div>
  );

  if (connected) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: minsLeft <= 10 ? '#E07070' : 'var(--green)', fontWeight: '500' }}>
        ✓ Outlook {minsLeft <= 10 ? `(${minsLeft}m left)` : ''}
      </span>
      {minsLeft <= 10 && (
        <button className="btn btn-sm" style={{ fontSize: '11px', color: '#C0392B', borderColor: '#FBBDBD' }} onClick={handleConnect}>
          Reconnect
        </button>
      )}
      <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--text-3)' }} onClick={handleDisconnect}>Disconnect</button>
    </div>
  );

  return (
    <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }} onClick={handleConnect}>
      <span>📅</span> Connect Outlook
    </button>
  );
}

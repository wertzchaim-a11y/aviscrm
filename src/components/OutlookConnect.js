import React, { useState, useEffect } from 'react';
import { getOutlookAuthUrl, isOutlookConnected, clearTokens, exchangeCodeForTokens, saveTokens } from '../lib/outlookSync';

export default function OutlookConnect({ onConnected }) {
  const [connected, setConnected] = useState(isOutlookConnected());
  const [loading, setLoading] = useState(false);

  // Handle redirect back from Microsoft login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state === 'outlook_auth') {
      setLoading(true);
      exchangeCodeForTokens(code).then(tokens => {
        if (tokens.access_token) {
          saveTokens(tokens);
          setConnected(true);
          onConnected && onConnected();
        }
        setLoading(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  const handleConnect = () => {
    window.location.href = getOutlookAuthUrl();
  };

  const handleDisconnect = () => {
    clearTokens();
    setConnected(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-3)' }}>
      <div style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Connecting to Outlook…
    </div>
  );

  if (connected) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>
        <span>✓</span> Outlook connected
      </div>
      <button className="btn btn-sm" style={{ fontSize: '11px', color: 'var(--text-3)' }} onClick={handleDisconnect}>Disconnect</button>
    </div>
  );

  return (
    <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }} onClick={handleConnect}>
      <span style={{ fontSize: '14px' }}>📅</span> Connect Outlook
    </button>
  );
}

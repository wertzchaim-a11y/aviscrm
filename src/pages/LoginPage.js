import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
 
export default function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const type = params.get('type');
    return (type === 'invite' || type === 'recovery') ? 'setPassword' : 'login';
  });
 
  const [tokenType] = useState(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    return params.get('type') || '';
  });
 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
 
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) { setError('Incorrect email or password.'); setLoading(false); }
  };
 
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) { setError(error.message); }
    else { setMessage('Check your email for a password reset link!'); }
    setLoading(false);
  };
 
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    // On success, useAuth's onAuthStateChange handles login automatically
  };
 
  const logo = (
    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
      <div style={{ width: '48px', height: '48px', background: 'var(--green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', color: '#fff', fontWeight: '600' }}>A</div>
      <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px' }}>Avi's CRM</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Operations Manager</p>
    </div>
  );
 
  const wrap = (children) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {logo}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {children}
        </div>
      </div>
    </div>
  );
 
  // ── Set password (invite or forgot password reset) ──
  if (mode === 'setPassword') return wrap(
    <>
      <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
        {tokenType === 'invite' ? '👋 Welcome — set your password' : '🔒 Set a new password'}
      </h2>
      <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label>New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required autoFocus />
        </div>
        <div className="form-group">
          <label>Confirm password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required />
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Saving…' : 'Set password & sign in'}
        </button>
      </form>
    </>
  );
 
  // ── Forgot password ──
  if (mode === 'forgot') return wrap(
    <>
      <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Reset your password</h2>
      {message
        ? <p style={{ color: 'var(--green)', fontSize: '13px', margin: 0 }}>{message}</p>
        : <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>Your email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
      }
      <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}
        style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
        ← Back to sign in
      </button>
    </>
  );
 
  // ── Login ──
  return wrap(
    <>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button onClick={() => { setMode('forgot'); setError(''); setEmail(''); }}
        style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
        Forgot password?
      </button>
    </>
  );
}
 

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email);
    if (error) { setError(error.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', color: '#fff', fontWeight: '600' }}>A</div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px' }}>Avi's CRM</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Operations Manager</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center' }}>No password needed — we'll email you a login link.</p>
          </form>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Check your email</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.6' }}>We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.</p>
            <button className="btn btn-sm" style={{ marginTop: '20px' }} onClick={() => setSent(false)}>Use a different email</button>
          </div>
        )}
      </div>
    </div>
  );
}

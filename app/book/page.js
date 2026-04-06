'use client';

import { useState } from 'react';

const RATE_PER_HOUR = 18;

export default function BookPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [postcode, setPostcode] = useState('');
  const [hours, setHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const price = hours * RATE_PER_HOUR;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, postcode, hours: Number(hours), price }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Book a Cleaning</h1>
        <p style={styles.subheading}>Professional cleaning at £{RATE_PER_HOUR}/hr</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name
            <input
              style={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              disabled={loading}
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              disabled={loading}
            />
          </label>

          <label style={styles.label}>
            Postcode
            <input
              style={styles.input}
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="SW1A 1AA"
              required
              disabled={loading}
            />
          </label>

          <label style={styles.label}>
            Hours
            <input
              style={styles.input}
              type="number"
              value={hours}
              min={2}
              onChange={(e) => setHours(Number(e.target.value))}
              required
              disabled={loading}
            />
          </label>

          <div style={styles.priceBox}>
            Total: <strong>£{price}</strong>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Booking…' : 'Book Now'}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'system-ui, sans-serif',
    background: '#f5f5f5',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px 28px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  heading: {
    margin: '0 0 4px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111',
  },
  subheading: {
    margin: '0 0 24px',
    color: '#666',
    fontSize: '0.95rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  priceBox: {
    background: '#f0f7ff',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '1rem',
    color: '#111',
  },
  button: {
    padding: '12px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
  buttonDisabled: {
    background: '#888',
    cursor: 'not-allowed',
  },
  error: {
    color: '#c0392b',
    background: '#fdf0ef',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.9rem',
    margin: 0,
  },
};

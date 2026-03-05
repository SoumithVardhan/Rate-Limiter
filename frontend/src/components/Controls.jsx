const spinner = (
  <span style={{
    display: 'inline-block', width: 11, height: 11, borderRadius: '50%',
    border: '2px solid #ffffff33', borderTopColor: '#fff',
    animation: 'spin 0.6s linear infinite',
  }} />
)

export default function Controls({ onSend, onBurst, onReset, loading, burstCount, onBurstCountChange }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
        Actions
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Send Request */}
        <button
          onClick={onSend} disabled={loading}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 'var(--radius)',
            background: 'var(--blue)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? spinner : '▶'} Send Request
        </button>

        {/* Burst count + Send Burst */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="number"
            value={burstCount}
            min={1} max={50}
            onChange={e => onBurstCountChange(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            style={{ width: 64, textAlign: 'center' }}
          />
          <button
            onClick={onBurst} disabled={loading}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 'var(--radius)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: '#fbbf24', fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ⚡ Send Burst
          </button>
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 'var(--radius)',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-3)', fontSize: 12, cursor: 'pointer',
          }}
        >
          ↺ Reset Counters
        </button>
      </div>
    </div>
  )
}

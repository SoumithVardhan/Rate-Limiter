export default function Stats({ stats }) {
  const { total, allowed, blocked, remaining } = stats

  const items = [
    { label: 'Sent',      value: total,                               color: 'var(--text)'  },
    { label: 'Allowed',   value: allowed,                             color: 'var(--green)' },
    { label: 'Blocked',   value: blocked,                             color: 'var(--red)'   },
    { label: 'Remaining', value: remaining !== null ? remaining : '—', color: remaining === 0 ? 'var(--red)' : 'var(--blue)' },
  ]

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
        Stats
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '8px 10px', borderRadius: 'var(--radius)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

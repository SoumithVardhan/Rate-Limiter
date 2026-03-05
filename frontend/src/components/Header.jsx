export default function Header() {
  const node = (label, color) => (
    <span style={{
      padding: '2px 8px', borderRadius: 4,
      background: color + '15', color, fontSize: 11, fontWeight: 500,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  )

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 46, flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Rate Limiter</span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
        {node('Client', '#a1a1aa')}
        <span>→</span>
        {node('Rate Limiter :4000', '#eab308')}
        <span>↔</span>
        {node('Redis :6379', '#ef4444')}
        <span>→</span>
        {node('Server-1 / Server-2', '#22c55e')}
      </div>
    </header>
  )
}

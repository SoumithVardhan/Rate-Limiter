const ALGORITHMS = [
  { id: 'sliding-window-counter', label: 'Sliding Window Counter', sub: 'Weighted window blending'      },
  { id: 'token-bucket',           label: 'Token Bucket',           sub: 'Steady refill, burst-friendly' },
  { id: 'fixed-window',           label: 'Fixed Window Counter',   sub: 'Fixed time intervals'          },
  { id: 'sliding-window-log',     label: 'Sliding Window Log',     sub: 'Exact timestamp tracking'      },
]

export default function AlgorithmTabs({ value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 6,
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      overflowX: 'auto',
    }}>
      {ALGORITHMS.map(a => {
        const active = value === a.id
        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            style={{
              flex: 1, minWidth: 160,
              padding: '10px 14px', borderRadius: 'var(--radius)',
              background: active ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
              textAlign: 'left', cursor: 'pointer',
              borderTop: active ? `2px solid var(--blue)` : `2px solid transparent`,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: active ? 'var(--text)' : 'var(--text-2)',
              marginBottom: 2,
            }}>
              {a.label}
            </div>
            <div style={{ fontSize: 11, color: active ? 'var(--text-3)' : '#3f3f46' }}>
              {a.sub}
            </div>
          </button>
        )
      })}
    </div>
  )
}

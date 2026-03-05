const ALGO_META = {
  'sliding-window-counter': { label: 'Sliding Window Counter', sub: 'Weighted window blending' },
  'token-bucket':           { label: 'Token Bucket',           sub: 'Steady refill, burst-friendly' },
  'fixed-window':           { label: 'Fixed Window Counter',   sub: 'Fixed time intervals' },
  'sliding-window-log':     { label: 'Sliding Window Log',     sub: 'Exact timestamp tracking' },
}

export default function Visualization({ stats, config, logs }) {
  const meta      = ALGO_META[logs[0]?.algorithm] ?? ALGO_META['sliding-window-counter']
  const maxBlocks = stats.limit ?? config.maxRequests
  const used      = stats.remaining !== null ? Math.max(0, maxBlocks - stats.remaining) : 0
  const pct       = maxBlocks > 0 ? (used / maxBlocks) * 100 : 0
  const atCap     = stats.remaining === 0
  const hasData   = logs.length > 0

  const blockSize = maxBlocks <= 20 ? 38 : maxBlocks <= 40 ? 28 : 22
  const fillColor = atCap ? '#ef4444' : '#22c55e'
  const barColor  = atCap ? '#ef4444' : '#22c55e'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '28px 40px', overflow: 'hidden',
    }}>
      {/* Algorithm name */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          {meta.label}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{meta.sub}</p>
      </div>

      {/* Block grid + progress */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
      }}>
        {!hasData ? (
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Send a request to begin</p>
        ) : (
          <>
            {/* Tiles */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 5,
              maxWidth: Math.min(maxBlocks, 15) * (blockSize + 5),
              justifyContent: 'center',
            }}>
              {Array.from({ length: maxBlocks }, (_, i) => {
                const filled = i < used
                return (
                  <div
                    key={i}
                    style={{
                      width: blockSize, height: blockSize, borderRadius: 4,
                      background: filled ? fillColor + '55' : 'transparent',
                      border: `1px solid ${filled ? fillColor : 'var(--border)'}`,
                      transition: 'all 0.2s ease',
                    }}
                  />
                )
              })}
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 480 }}>
              <div style={{
                height: 5, borderRadius: 3,
                background: 'var(--border)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: barColor, borderRadius: 3,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
              <p style={{
                textAlign: 'center', marginTop: 10,
                fontSize: 13, color: 'var(--text-3)',
              }}>
                <span style={{ color: atCap ? 'var(--red)' : 'var(--text-2)', fontWeight: 500 }}>
                  {used}
                </span>
                {' / '}{maxBlocks} requests used
                {atCap && (
                  <span style={{ color: 'var(--red)', marginLeft: 10, fontWeight: 600 }}>
                    · limit reached
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

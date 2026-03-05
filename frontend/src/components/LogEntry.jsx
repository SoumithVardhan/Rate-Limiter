export default function LogEntry({ entry }) {
  const { allowed, server, remaining, limit, retryAfter, timestamp } = entry
  const time = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 0', borderBottom: '1px solid var(--border)',
      fontSize: 12, animation: 'fadeIn 0.12s ease',
    }}>
      {/* Icon */}
      <span style={{ fontWeight: 700, color: allowed ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
        {allowed ? '✓' : '✗'}
      </span>

      {/* Status */}
      <span style={{ fontWeight: 600, color: allowed ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
        {allowed ? 'Allowed' : 'Blocked'}
      </span>

      {/* Server */}
      {server && (
        <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
          — {server}
        </span>
      )}

      {/* Remaining */}
      {remaining !== undefined && remaining !== null && (
        <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
          — {remaining}/{limit ?? '?'} rem
        </span>
      )}

      {/* Retry */}
      {!allowed && retryAfter && (
        <span style={{ color: 'var(--red)', opacity: 0.7, flexShrink: 0 }}>
          — retry {retryAfter}s
        </span>
      )}

      {/* Time */}
      <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>
        {time}
      </span>
    </div>
  )
}

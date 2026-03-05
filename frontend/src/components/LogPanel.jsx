import LogEntry from './LogEntry'

export default function LogPanel({ logs, onClear }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
            Request Log
          </span>
          <span style={{
            padding: '0px 6px', borderRadius: 8, fontSize: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text-3)',
          }}>
            {logs.length}
          </span>
        </div>
        {logs.length > 0 && (
          <button onClick={onClear} style={{
            fontSize: 10, color: 'var(--text-3)', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: 0,
          }}>
            Clear
          </button>
        )}
      </div>

      {/* List */}
      {logs.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No requests yet</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {logs.map(entry => <LogEntry key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  )
}

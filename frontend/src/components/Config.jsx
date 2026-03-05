const FIELDS = [
  { key: 'maxRequests',       label: 'Max Requests',  min: 1,  max: 100, step: 1 },
  { key: 'windowSizeSeconds', label: 'Window (sec)',   min: 5,  max: 300, step: 5 },
]

export default function Config({ config, onChange }) {
  const handle = (key, min, max, raw) => {
    const val = parseInt(raw)
    if (!isNaN(val)) onChange({ ...config, [key]: Math.max(min, Math.min(max, val)) })
  }

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
        Configuration
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
              {f.label}
            </label>
            <input
              type="number"
              value={config[f.key]}
              min={f.min} max={f.max} step={f.step}
              onChange={e => handle(f.key, f.min, f.max, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// BASE is empty — nginx proxies /request, /burst, /reset to rate-limiter internally.
// Works both in Docker (nginx → rate-limiter:4000) and local dev (Vite proxy → localhost:4000)
const BASE = ''

export async function sendRequest(algorithm, config) {
  const res = await fetch(`${BASE}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, config }),
  })
  if (!res.ok && res.status !== 429) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function sendBurst(algorithm, config, count) {
  const res = await fetch(`${BASE}/burst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, config, count }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function resetCounters() {
  const res = await fetch(`${BASE}/reset`, { method: 'POST' })
  return res.json()
}

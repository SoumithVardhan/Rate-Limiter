import { useState, useRef, useCallback } from 'react'
import Header        from './components/Header'
import AlgorithmTabs from './components/AlgorithmTabs'
import Visualization from './components/Visualization'
import Config        from './components/Config'
import Controls      from './components/Controls'
import Stats         from './components/Stats'
import LogPanel      from './components/LogPanel'
import { sendRequest, sendBurst, resetCounters } from './api'

const INIT_CONFIG = { maxRequests: 10, windowSizeSeconds: 60, burstCount: 10 }
const INIT_STATS  = { total: 0, allowed: 0, blocked: 0, remaining: null, limit: null }

const divider = <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

export default function App() {
  const [algorithm, setAlgorithm] = useState('sliding-window-counter')
  const [config, setConfig]       = useState(INIT_CONFIG)
  const [logs, setLogs]           = useState([])
  const [stats, setStats]         = useState(INIT_STATS)
  const [loading, setLoading]     = useState(false)
  const idxRef = useRef(0)

  const appendLog = useCallback((entry) => setLogs(prev => [entry, ...prev]), [])

  const updateStats = useCallback((allowed, remaining, limit) => {
    setStats(prev => ({
      total:     prev.total + 1,
      allowed:   allowed ? prev.allowed + 1 : prev.allowed,
      blocked:   allowed ? prev.blocked     : prev.blocked + 1,
      remaining: remaining ?? prev.remaining,
      limit:     limit     ?? prev.limit,
    }))
  }, [])

  const handleSend = useCallback(async () => {
    setLoading(true)
    idxRef.current++
    const idx = idxRef.current
    try {
      const data = await sendRequest(algorithm, {
        maxRequests:       config.maxRequests,
        windowSizeSeconds: config.windowSizeSeconds,
      })
      updateStats(data.allowed, data.remaining, data.limit)
      appendLog({ id: `${idx}-${Date.now()}`, index: idx, timestamp: Date.now(), algorithm, ...data })
    } catch (err) {
      appendLog({ id: `err-${idx}`, index: idx, timestamp: Date.now(), algorithm, allowed: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }, [algorithm, config, appendLog, updateStats])

  const handleBurst = useCallback(async () => {
    setLoading(true)
    try {
      const results = await sendBurst(algorithm, {
        maxRequests:       config.maxRequests,
        windowSizeSeconds: config.windowSizeSeconds,
      }, config.burstCount)
      results.forEach(item => {
        idxRef.current++
        updateStats(item.allowed, item.remaining, item.limit)
        appendLog({ id: `${idxRef.current}-${Date.now()}-${Math.random()}`, index: idxRef.current, timestamp: Date.now(), algorithm, ...item })
      })
    } catch (err) {
      idxRef.current++
      appendLog({ id: `err-${idxRef.current}`, index: idxRef.current, timestamp: Date.now(), allowed: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }, [algorithm, config, appendLog, updateStats])

  const handleReset = useCallback(async () => {
    await resetCounters().catch(() => {})
    setLogs([])
    setStats(INIT_STATS)
    idxRef.current = 0
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <Header />

      {/* Algorithm tabs — full width horizontal */}
      <AlgorithmTabs value={algorithm} onChange={(a) => { setAlgorithm(a); handleReset() }} />

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left — Visualization */}
        <main style={{
          flex: 1, overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}>
          <Visualization stats={stats} config={config} logs={logs} />
        </main>

        {/* Right — Controls panel */}
        <aside style={{
          width: 300, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Config */}
          <div style={{ padding: '16px 16px 0' }}>
            <Config config={config} onChange={setConfig} />
          </div>

          {divider && <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />}

          {/* Actions */}
          <div style={{ padding: '12px 16px 0' }}>
            <Controls
              onSend={handleSend}
              onBurst={handleBurst}
              onReset={handleReset}
              loading={loading}
              burstCount={config.burstCount}
              onBurstCountChange={(v) => setConfig(c => ({ ...c, burstCount: v }))}
            />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px 0' }} />

          {/* Stats */}
          <div style={{ padding: '12px 16px 0' }}>
            <Stats stats={stats} />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px 0' }} />

          {/* Log — takes remaining space */}
          <div style={{
            flex: 1, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            padding: '12px 16px 16px',
          }}>
            <LogPanel logs={logs} onClear={() => { setLogs([]); setStats(INIT_STATS); idxRef.current = 0 }} />
          </div>
        </aside>
      </div>
    </div>
  )
}

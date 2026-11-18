import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { reducedMotion } from './lib/motion.js'
import Explorer from './views/Explorer.jsx'
import EntryImpact from './views/EntryImpact.jsx'
import Watchlist from './views/Watchlist.jsx'
import About from './views/About.jsx'

const VIEWS = [
  { id: 'explorer', label: 'Route Explorer' },
  { id: 'entry', label: 'Entry Impact' },
  { id: 'watchlist', label: 'Risk Watchlist' },
  { id: 'about', label: 'About & method' },
]

const fromHash = () => {
  const h = window.location.hash.replace('#', '')
  return VIEWS.some((v) => v.id === h) ? h : 'explorer'
}

export default function App() {
  const [view, setView] = useState(fromHash)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'night' ? 'night' : 'day'))
  const introPlayed = useRef(false)

  useEffect(() => {
    try { localStorage.setItem('routeiq-theme', theme) } catch { /* private browsing: the choice lasts for this visit */ }
  }, [theme])

  // The whole page crossfades between day and night in one piece (View Transitions),
  // instead of each element changing colour on its own schedule
  const toggleTheme = () => {
    const next = theme === 'night' ? 'day' : 'night'
    const apply = () => {
      if (next === 'night') document.documentElement.dataset.theme = 'night'
      else delete document.documentElement.dataset.theme
      flushSync(() => setTheme(next))
    }
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(apply)
    else apply()
  }

  useEffect(() => {
    const onHash = () => setView(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    // Wait briefly for the typeface too, so text doesn't change shape in the middle of the opening sequence
    const fontReady = Promise.race([
      document.fonts?.load?.("700 1em 'Archivo'") ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 1500)),
    ]).catch(() => {})
    Promise.all(['routes', 'watchlist', 'entry_events'].map((f) =>
      fetch(`${import.meta.env.BASE_URL}data/${f}.json`).then((r) => {
        if (!r.ok) throw new Error(`${f}.json returned ${r.status}`)
        return r.json()
      }),
    ))
      .then(async (files) => { await fontReady; return files })
      .then(([routes, watchlist, events]) => setData({ routes, watchlist, events }))
      .catch((e) => setError(e.message))
  }, [])

  // route lookup by city pair, so the watchlist and the explorer can link to each other
  const index = useMemo(() => {
    if (!data) return null
    const byPair = new Map(data.routes.map((r) => [`${r.c1}|${r.c2}`, r]))
    const watchByPair = new Map(data.watchlist.map((w) => [`${w.c1}|${w.c2}`, w]))
    return { byPair, watchByPair }
  }, [data])

  const go = (id) => {
    window.location.hash = id
    setView(id)
    window.scrollTo({ top: 0 })
  }

  const openRoute = (c1, c2) => {
    const r = index?.byPair.get(`${c1}|${c2}`)
    if (r) setSelectedId(r.id)
    go('explorer')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#explorer" onClick={(e) => { e.preventDefault(); go('explorer') }}>
            <span className="brand-name">RouteIQ</span>
            <span className="brand-sub">Competitive route intelligence for airline pricing teams</span>
          </a>
          <nav className="tabs" aria-label="Sections">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                className={`tab ${view === v.id ? 'is-active' : ''}`}
                aria-current={view === v.id ? 'page' : undefined}
                onClick={() => go(v.id)}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <button
            className="theme-toggle"
            aria-pressed={theme === 'night'}
            onClick={toggleTheme}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              {theme === 'night'
                ? <path d="M10 3.2a.9.9 0 0 1 .9.9v.8a.9.9 0 1 1-1.8 0v-.8a.9.9 0 0 1 .9-.9Zm0 11a.9.9 0 0 1 .9.9v.8a.9.9 0 1 1-1.8 0v-.8a.9.9 0 0 1 .9-.9ZM3.2 10a.9.9 0 0 1 .9-.9h.8a.9.9 0 1 1 0 1.8h-.8a.9.9 0 0 1-.9-.9Zm11 0a.9.9 0 0 1 .9-.9h.8a.9.9 0 1 1 0 1.8h-.8a.9.9 0 0 1-.9-.9ZM10 6.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z" fill="currentColor" />
                : <path d="M15.6 12.3A6.3 6.3 0 0 1 7.7 4.4a.6.6 0 0 0-.8-.7 7.2 7.2 0 1 0 9.4 9.4.6.6 0 0 0-.7-.8Z" fill="currentColor" />}
            </svg>
            {theme === 'night' ? 'Day mode' : 'Night mode'}
          </button>
        </div>
      </header>

      <main className="page">
        {error && (
          <p className="notice">The route data didn't load ({error}). Refresh the page to try again.</p>
        )}
        {!error && !data && view !== 'about' && <p className="notice">Loading 6,313 routes…</p>}
        {data && view === 'explorer' && (
          <Explorer
            data={data} index={index} selectedId={selectedId} onSelect={setSelectedId}
            intro={!introPlayed.current} onIntroDone={() => { introPlayed.current = true }}
          />
        )}
        {data && view === 'entry' && <EntryImpact data={data} />}
        {data && view === 'watchlist' && <Watchlist data={data} onOpenRoute={openRoute} />}
        {view === 'about' && <About />}
      </main>

      <footer className="footer">
        <p>
          Built by Shubham Sarje from US DOT Domestic Airfare Consumer Report data (Table 6), 2019 Q1 to 2026 Q1.
          Figures are estimates for analysis, not airline financials.
        </p>
      </footer>
    </div>
  )
}

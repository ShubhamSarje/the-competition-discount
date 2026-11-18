import { useId, useMemo, useState } from 'react'
import { routeName } from '../lib/format.js'

// Type-ahead search over routes. Matches every word typed, in either city.
export default function RouteSearch({ routes, onPick, label = 'Find a route', placeholder = 'Type two cities, e.g. Boston Denver' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return routes
      .filter((r) => {
        const s = `${r.c1} ${r.c2}`.toLowerCase()
        return words.every((w) => s.includes(w))
      })
      .sort((a, b) => b.pax - a.pax)
      .slice(0, 8)
  }, [q, routes])

  const pick = (r) => {
    onPick(r)
    setQ('')
    setOpen(false)
  }

  const onKey = (e) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); pick(results[active]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="search">
      <label className="search-label" htmlFor={`${listId}-input`}>{label}</label>
      <input
        id={`${listId}-input`}
        className="search-input"
        type="search"
        value={q}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
      />
      {open && q && (
        <ul className="search-results" id={listId} role="listbox">
          {results.length === 0 && <li className="search-empty">No route matches “{q}”. Try one city name.</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseDown={() => pick(r)}
              onMouseEnter={() => setActive(i)}
            >
              <span>{routeName(r)}</span>
              <span className="search-meta">{Math.round(r.pax).toLocaleString()} passengers/day</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

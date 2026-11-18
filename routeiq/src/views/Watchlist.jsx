import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BANDS, BAND_LABEL, LATEST_PERIOD, RISK_RATE } from '../lib/constants.js'
import { num, pctRatio, usd, usdShort } from '../lib/format.js'
import { C, lineMotion, tick, tooltip } from '../lib/chart.js'

const PAGE = 50

function toCsv(rows) {
  const head = ['rank', 'route', 'top_airline', 'top_airline_share', 'distance_band', 'passengers_per_day', 'fare', 'benchmark_fare', 'fare_premium', 'top_airline_revenue_q', 'revenue_at_risk_q']
  const esc = (v) => (typeof v === 'string' && /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = rows.map((w) => [w.rank, `${w.c1} - ${w.c2}`, w.air, w.share, w.band, w.pax, w.fare, w.bench, w.prem, w.revQ, w.riskQ].map(esc).join(','))
  return [head.join(','), ...lines].join('\n')
}

export default function Watchlist({ data, onOpenRoute }) {
  const all = data.watchlist
  const [q, setQ] = useState('')
  const [airline, setAirline] = useState('All airlines')
  const [band, setBand] = useState('All distances')
  const [limit, setLimit] = useState(PAGE)

  const total = useMemo(() => all.reduce((s, w) => s + w.riskQ, 0), [all])

  const { pareto, half, eighty } = useMemo(() => {
    let run = 0
    let half = null
    let eighty = null
    const pts = []
    all.forEach((w, i) => {
      run += w.riskQ
      const share = run / total
      if (half == null && share >= 0.5) half = i + 1
      if (eighty == null && share >= 0.8) eighty = i + 1
      if (i % 10 === 0 || i === all.length - 1) pts.push({ rank: i + 1, share: Math.round(share * 1000) / 10 })
    })
    return { pareto: pts, half, eighty }
  }, [all, total])

  const byAirline = useMemo(() => {
    const m = new Map()
    all.forEach((w) => {
      const a = m.get(w.air) ?? { air: w.air, routes: 0, risk: 0, top: null }
      a.routes += 1
      a.risk += w.riskQ
      if (w.rankAir === 1) a.top = w
      m.set(w.air, a)
    })
    return [...m.values()].sort((a, b) => b.risk - a.risk)
  }, [all])

  const airlines = ['All airlines', ...byAirline.map((a) => a.air)]

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter((w) =>
      (airline === 'All airlines' || w.air === airline) &&
      (band === 'All distances' || w.band === band) &&
      words.every((x) => `${w.c1} ${w.c2}`.toLowerCase().includes(x)))
  }, [all, q, airline, band])

  const filteredRisk = rows.reduce((s, w) => s + w.riskQ, 0)

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `routeiq-watchlist-${LATEST_PERIOD}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="view">
      <section className="lead">
        <h1 className="lead-title">{usdShort(total)} a quarter is exposed, and {half} routes hold half of it.</h1>
        <p className="lead-text">
          {all.length.toLocaleString()} routes in {LATEST_PERIOD} have a full-service airline on top, no low-cost airline as the cheapest option,
          and a fare above the low-cost benchmark. If a low-cost airline became the cheapest option on each, the top airline would lose
          an estimated {usdShort(total)} a quarter, about {usdShort(total * 4)} a year.
        </p>
      </section>

      <section className="panel">
        <div className="two-col">
          <div>
            <h2 className="panel-title">Exposure by airline</h2>
            <ul className="bars">
              {byAirline.map((a) => (
                <li key={a.air} className="bar-row">
                  <div className="bar-head">
                    <span className="bar-name">{a.air}</span>
                    <span className="bar-value">{usdShort(a.risk)} <span className="bar-share">{Math.round((a.risk / total) * 100)}%</span></span>
                  </div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(a.risk / byAirline[0].risk) * 100}%` }} /></div>
                  <p className="bar-note">{a.routes.toLocaleString()} routes. Biggest: {a.top ? `${a.top.c1} – ${a.top.c2}` : '–'}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="panel-title">A short list holds most of the risk</h2>
            <p className="panel-sub">Share of total revenue at risk, adding routes from the biggest down. {half} routes reach 50%, {eighty?.toLocaleString()} reach 80%.</p>
            <div className="chart">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={pareto} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.rule} vertical={false} />
                  <XAxis dataKey="rank" type="number" domain={[1, all.length]} tick={tick} tickLine={false} axisLine={{ stroke: C.rule }} ticks={[1, 500, 1000, 1500, 2000, 2700]} tickFormatter={(v) => v.toLocaleString()} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={tick} tickLine={false} axisLine={false} width={44} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Share of total']} labelFormatter={(v) => `Top ${v.toLocaleString()} routes`} {...tooltip} />
                  <ReferenceLine x={half} stroke={C.ink} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="share" stroke={C.accent} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} {...lineMotion()} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">The watchlist</h2>
        <div className="filters">
          <label className="filter filter-grow">
            <span className="search-label">Search a city</span>
            <input className="search-input" type="search" value={q} placeholder="e.g. Chicago" onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
          </label>
          <label className="filter">
            <span className="search-label">Top airline</span>
            <select value={airline} onChange={(e) => { setAirline(e.target.value); setLimit(PAGE) }}>
              {airlines.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="filter">
            <span className="search-label">Distance</span>
            <select value={band} onChange={(e) => { setBand(e.target.value); setLimit(PAGE) }}>
              <option>All distances</option>
              {BANDS.map((b) => <option key={b} value={b}>{BAND_LABEL[b]}</option>)}
            </select>
          </label>
          <button className="button" onClick={download}>Download CSV</button>
        </div>
        <p className="filter-count">{rows.length.toLocaleString()} routes, {usdShort(filteredRisk)} at risk per quarter</p>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="num">Rank</th>
                <th scope="col">Route</th>
                <th scope="col">Top airline</th>
                <th scope="col" className="num">Its share</th>
                <th scope="col" className="num">Fare</th>
                <th scope="col" className="num">Premium</th>
                <th scope="col" className="num">Passengers/day</th>
                <th scope="col" className="num">At risk per quarter</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((w) => (
                <tr key={w.rank + w.c1 + w.c2}>
                  <td className="num">{w.rank.toLocaleString()}</td>
                  <td>
                    <button className="link" onClick={() => onOpenRoute(w.c1, w.c2)}>{w.c1} – {w.c2}</button>
                  </td>
                  <td>{w.air}</td>
                  <td className="num">{Math.round(w.share * 100)}%</td>
                  <td className="num">{usd(w.fare)}</td>
                  <td className="num">{pctRatio(w.prem)}</td>
                  <td className="num">{num(w.pax)}</td>
                  <td className="num is-risk">{usdShort(w.riskQ)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="notice">No routes match these filters. Clear the search or pick another airline.</p>}
        {limit < rows.length && <button className="button-quiet" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more routes</button>}
        <p className="footnote">
          Revenue at risk = top airline's estimated quarterly revenue × {(RISK_RATE * 100).toFixed(1)}%. It is the expected loss if a low-cost airline becomes the cheapest option,
          not the chance that it will. Select a route to open it in the Route Explorer.
        </p>
      </section>
    </div>
  )
}

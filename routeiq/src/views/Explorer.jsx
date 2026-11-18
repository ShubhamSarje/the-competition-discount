import { useEffect, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import RouteSearch from '../components/RouteSearch.jsx'
import { BAND_LABEL, GROUP_LABEL, LATEST_PERIOD, PREMIUM_BY_BAND, PREMIUM_TREND, RISK_RATE } from '../lib/constants.js'
import { num, pct, pctRatio, usd, usdShort } from '../lib/format.js'
import { C, lineMotion, tick, tooltip } from '../lib/chart.js'
import { AnimatedNumber, useReady } from '../lib/motion.js'

// Insert an empty point where 2020-2021 is missing, so lines break instead of joining across COVID
const withCovidGap = (rows) => {
  const out = []
  rows.forEach((r, i) => {
    if (i > 0 && rows[i - 1].period.startsWith('2019') && r.period.startsWith('2022')) out.push({ period: '2020–21' })
    out.push(r)
  })
  return out
}


const TREND = withCovidGap(PREMIUM_TREND)

// Markers move with transforms (not left/width), so the browser can animate them without re-laying out the page
function FareGauge({ fare: actualFare, bench }) {
  // On first paint the fare marker sits on the benchmark, then slides out to the route's fare
  const ready = useReady()
  const fare = ready ? actualFare : bench
  const lo = Math.min(actualFare, bench) * 0.75
  const hi = Math.max(actualFare, bench) * 1.12
  const x = (v) => ((v - lo) / (hi - lo)) * 100
  const above = actualFare >= bench
  const left = Math.min(x(fare), x(bench))
  const right = 100 - Math.max(x(fare), x(bench))
  // Labels near an edge hang inward so they never run off the card on a phone
  const side = (pos) => (pos > 68 ? 'is-end' : pos < 32 ? 'is-start' : '')
  return (
    <div className="gauge" role="img" aria-label={`Average fare ${usd(actualFare)} against a low-cost benchmark of ${usd(bench)}`}>
      <div className="gauge-track">
        <div className={`gauge-gap ${above ? 'is-above' : 'is-below'}`} style={{ clipPath: `inset(0 ${right}% 0 ${left}% round 5px)` }} />
        <div className="gauge-layer" style={{ transform: `translateX(${x(bench)}%)` }}>
          <div className="gauge-mark gauge-bench">
            <span className={`gauge-label gauge-label-below ${side(x(bench))}`}>Low-cost benchmark {usd(bench)}</span>
          </div>
        </div>
        <div className="gauge-layer" style={{ transform: `translateX(${x(fare)}%)` }}>
          <div className="gauge-mark gauge-fare">
            <span className={`gauge-label gauge-label-above ${side(x(actualFare))}`}>This route {usd(actualFare)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Explorer({ data, index, selectedId, onSelect, intro, onIntroDone }) {
  const { routes } = data
  const defaultRoute = useMemo(
    () => index.byPair.get('New York City, NY|San Francisco, CA') ?? routes[0],
    [index, routes],
  )
  const route = routes.find((r) => r.id === selectedId) ?? defaultRoute
  const watch = index.watchByPair.get(`${route.c1}|${route.c2}`)

  // The opening sequence plays once per visit; later tab switches skip it
  useEffect(() => { onIntroDone?.() }, [onIntroDone])
  // During the opening sequence the chart lines wait until their panels have appeared
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const motion = useMemo(() => lineMotion(intro ? 1000 : 0), [])

  const history = useMemo(
    () => withCovidGap(route.hist.p.map((p, i) => ({ period: p, fare: route.hist.f[i], bench: route.hist.b[i] }))),
    [route],
  )

  const noLowCost = route.lowGroup === 'full_service'
  let riskNote
  if (watch) riskNote = `Rank ${watch.rank.toLocaleString()} of 2,700 on the watchlist.`
  else if (route.lowGroup === 'low_cost') riskNote = `Not on the watchlist: ${route.low}, a low-cost airline, is already the cheapest option.`
  else if (noLowCost && route.prem <= 0) riskNote = 'Not on the watchlist: the fare is already at or below the low-cost benchmark.'
  else if (route.lowGroup !== 'full_service') riskNote = `Not on the watchlist: the cheapest airline is ${route.low} (${GROUP_LABEL[route.lowGroup].toLowerCase()}).`
  else riskNote = 'Not on the watchlist: the top airline is not full-service.'

  const premiumText = route.prem >= 0
    ? `${pctRatio(route.prem).replace('+', '')} above low-cost routes of similar distance this quarter.`
    : `${pctRatio(-route.prem).replace('+', '')} below low-cost routes of similar distance this quarter.`

  return (
    <div className={`view ${intro ? 'is-intro' : ''}`}>
      <section className="explorer-head">
        <RouteSearch routes={routes} onPick={(r) => onSelect(r.id)} />
      </section>

      <section className="strip" aria-label="Selected route">
        <h1 className="strip-cities" key={route.id}>
          <span className="strip-city">{route.c1}</span>
          <span className="strip-path" aria-hidden="true">
            <span className="strip-dot strip-dot-a" />
            <span className="strip-line" />
            <span className="strip-plane-layer"><span className="strip-plane" /></span>
            <span className="strip-dot strip-dot-b" />
          </span>
          <span className="visually-hidden"> to </span>
          <span className="strip-city strip-city-b">{route.c2}</span>
        </h1>
        <p className="strip-meta">
          {num(route.mi)} miles, {BAND_LABEL[route.band]} band. {num(route.pax)} passengers a day in {LATEST_PERIOD}.
        </p>

        <div className="premium-line">
          <p className="premium-figure">
            <span className={route.prem >= 0 ? 'is-premium' : 'is-discount'}>
              <AnimatedNumber value={route.prem * 100} format={pct} duration={1100} fromZero={intro} delay={250} />
            </span>
          </p>
          <p className="premium-text">Average fare runs {premiumText}</p>
        </div>
        <FareGauge fare={route.fare} bench={route.bench} />
      </section>

      <section className="facts" aria-label="Route facts">
        <div className="fact">
          <p className="fact-label">Top airline</p>
          <p className="fact-value">{route.dom}</p>
          <p className="fact-note">{pctRatio(route.domShare, 0).replace('+', '')} of passengers</p>
        </div>
        <div className="fact">
          <p className="fact-label">Cheapest airline</p>
          <p className="fact-value">{route.low}</p>
          <p className="fact-note">{GROUP_LABEL[route.lowGroup]}{route.lcc ? ', on the low-cost list' : ''}</p>
        </div>
        <div className="fact">
          <p className="fact-label">Top airline's revenue per quarter</p>
          <p className="fact-value">{usdShort(route.domRevQ)}</p>
          <p className="fact-note">Estimate: passengers × share × its fare</p>
        </div>
        <div className={`fact ${watch ? 'fact-risk' : ''}`}>
          <p className="fact-label">Revenue at risk per quarter</p>
          <p className="fact-value">{watch ? <AnimatedNumber value={watch.riskQ} format={usdShort} duration={900} fromZero={intro} delay={700} /> : 'None flagged'}</p>
          <p className="fact-note">{riskNote}</p>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Fare against the low-cost benchmark, 2019 to 2026</h2>
        <p className="panel-sub">
          Benchmark = median fare of routes in the same distance band where a low-cost airline is cheapest.
          2020 and 2021 are left out because of COVID.
        </p>
        <ul className="legend" aria-hidden="true">
          <li><span className="legend-swatch" style={{ background: C.line }} />This route's average fare</li>
          <li><span className="legend-swatch legend-dashed" style={{ borderColor: C.lowcost }} />Low-cost benchmark</li>
        </ul>
        <div className="chart">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.rule} vertical={false} />
              <XAxis dataKey="period" tick={tick} tickLine={false} axisLine={{ stroke: C.rule }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={tick} tickLine={false} axisLine={false} width={56} domain={['auto', 'auto']} />
              <Tooltip formatter={(v, n) => [usd(v), n]} {...tooltip} />
              <Line type="linear" connectNulls={false} dataKey="fare" name="This route's average fare" stroke={C.line} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} {...motion} />
              <Line type="linear" connectNulls={false} dataKey="bench" name="Low-cost benchmark" stroke={C.lowcost} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} {...motion} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Market context: the premium is the thinnest since 2019</h2>
        <p className="panel-sub">
          How much more routes with no low-cost competition charge than low-cost routes of similar distance,
          weighted by passengers. It peaked at 33.2% in 2022 Q3 and fell to 12.8% in 2026 Q1.
        </p>
        <div className="two-col">
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={TREND} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.rule} vertical={false} />
                <XAxis dataKey="period" tick={tick} tickLine={false} axisLine={{ stroke: C.rule }} minTickGap={24} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={tick} tickLine={false} axisLine={false} width={44} domain={[0, 35]} ticks={[0, 10, 20, 30]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Premium']} {...tooltip} />
                <Line type="linear" connectNulls={false} dataKey="premium" stroke={C.accent} strokeWidth={2.5} dot={{ r: 2.5, fill: C.accent }} activeDot={{ r: 5 }} {...motion} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="table table-compact">
            <caption className="table-caption">Premium by distance, average across quarters</caption>
            <thead>
              <tr><th scope="col">Distance</th><th scope="col" className="num">Typical route</th><th scope="col" className="num">Passenger-weighted</th></tr>
            </thead>
            <tbody>
              {PREMIUM_BY_BAND.map((b) => (
                <tr key={b.band}>
                  <td>{BAND_LABEL[b.band]}</td>
                  <td className="num">{pct(b.route)}</td>
                  <td className="num">{pct(b.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Revenue at risk on this page = the top airline's estimated quarterly revenue × {(RISK_RATE * 100).toFixed(1)}%, the median loss after a low-cost entry.</p>
      </section>
    </div>
  )
}

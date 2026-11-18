import { useMemo, useState } from 'react'
import RouteSearch from '../components/RouteSearch.jsx'
import { BAND_LABEL, ENTRY_ALL, ENTRY_BY_BAND, ENTRY_BY_TYPE, INCUMBENT, LEADER } from '../lib/constants.js'
import { AnimatedNumber } from '../lib/motion.js'
import { num, pct, possessive, routeName, usd, usdShort, usdSigned } from '../lib/format.js'

const ENTRANTS = [
  { id: 'any', label: 'Any low-cost airline' },
  { id: 'ulcc', label: 'An ultra-low-cost airline' },
  { id: 'southwest', label: 'Southwest' },
]

function effectsFor(entrant, band) {
  if (entrant === 'any') {
    const b = ENTRY_BY_BAND.find((x) => x.band === band)
    return { fare: b.fare, pax: b.pax, incumbent: INCUMBENT.median, basis: `${b.events} past entries in the ${BAND_LABEL[band]} band; incumbent revenue from ${INCUMBENT.events} entries where the same airline stayed on top` }
  }
  const t = ENTRY_BY_TYPE[entrant]
  return { fare: t.fare, pax: t.pax, incumbent: t.incumbent, basis: `${t.events} past entries by ${entrant === 'southwest' ? 'Southwest' : 'ultra-low-cost airlines'}; incumbent revenue from ${t.incumbentEvents} entries${t.incumbentEvents < 50 ? ', a thin sample' : ''}` }
}

function Estimator({ routes }) {
  const candidates = useMemo(() => routes.filter((r) => r.lowGroup === 'full_service'), [routes])
  const [route, setRoute] = useState(() => candidates.find((r) => r.c1 === 'New York City, NY' && r.c2 === 'San Francisco, CA') ?? candidates[0])
  const [entrant, setEntrant] = useState('any')
  const e = effectsFor(entrant, route.band)

  // Numbers roll to their new values when the route or the entrant changes
  const newFare = route.fare * (1 + e.fare / 100)
  const newPax = route.pax * (1 + e.pax / 100)
  const revChange = route.domRevQ * (e.incumbent / 100)

  return (
    <section className="panel estimator">
      <h2 className="panel-title">What if a low-cost airline became the cheapest option here?</h2>
      <p className="panel-sub">Pick a route with no low-cost competition today. The estimate applies what happened after 193 past entries.</p>
      <div className="estimator-controls">
        <RouteSearch routes={candidates} onPick={setRoute} label="Route" placeholder="Search routes with no low-cost airline" />
        <fieldset className="segmented">
          <legend className="search-label">Who becomes the cheapest option</legend>
          {ENTRANTS.map((o) => (
            <label key={o.id} className={entrant === o.id ? 'is-active' : ''}>
              <input type="radio" name="entrant" value={o.id} checked={entrant === o.id} onChange={() => setEntrant(o.id)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>

      <p className="estimator-route">{routeName(route)} <span>{route.dom} on top with {Math.round(route.domShare * 100)}% of passengers</span></p>

      <div className="estimate-grid">
        <div className="estimate">
          <p className="fact-label">Average fare</p>
          <p className="estimate-now">{usd(route.fare)} now</p>
          <p className="estimate-then"><AnimatedNumber value={newFare} format={usd} duration={700} /></p>
          <p className="fact-note">{pct(e.fare)}</p>
        </div>
        <div className="estimate">
          <p className="fact-label">Passengers per day</p>
          <p className="estimate-now">{num(route.pax)} now</p>
          <p className="estimate-then"><AnimatedNumber value={newPax} format={num} duration={700} /></p>
          <p className="fact-note">{pct(e.pax)}</p>
        </div>
        <div className="estimate estimate-key">
          <p className="fact-label">Change in {possessive(route.dom)} revenue per quarter</p>
          <p className="estimate-now">{usdShort(route.domRevQ)} a quarter now</p>
          <p className="estimate-then"><AnimatedNumber value={revChange} format={usdSigned} duration={700} /></p>
          <p className="fact-note">
            {pct(e.incumbent)}
            {entrant === 'any' && <> (middle half of past entries: {usdSigned(route.domRevQ * INCUMBENT.p25 / 100)} to {usdSigned(route.domRevQ * INCUMBENT.p75 / 100)})</>}
          </p>
        </div>
      </div>
      <p className="footnote">Based on {e.basis}. A historical pattern, not a forecast for this route.</p>
    </section>
  )
}

function EventsTable({ events }) {
  const airlines = useMemo(() => ['All', ...Array.from(new Set(events.map((e) => e.entrant))).sort()], [events])
  const [airline, setAirline] = useState('All')
  const [limit, setLimit] = useState(20)
  const rows = events.filter((e) => airline === 'All' || e.entrant === airline)

  return (
    <section className="panel">
      <h2 className="panel-title">The 193 entries behind these numbers</h2>
      <p className="panel-sub">
        Raw averages for the 4 quarters before and the 4 after each entry, before the comparison with similar routes.
        Entries from {LEADER.first} to {LEADER.last}.
      </p>
      <div className="filters">
        <label className="filter">
          <span className="search-label">Airline that became cheapest</span>
          <select value={airline} onChange={(e) => { setAirline(e.target.value); setLimit(20) }}>
            {airlines.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <p className="filter-count">{rows.length} entries</p>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Quarter</th>
              <th scope="col">Route</th>
              <th scope="col">Became cheapest</th>
              <th scope="col">Top airline before, after</th>
              <th scope="col" className="num">Fare</th>
              <th scope="col" className="num">Passengers/day</th>
              <th scope="col" className="num">Top airline's share</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((e, i) => (
              <tr key={`${e.period}-${e.c1}-${e.c2}-${i}`}>
                <td>{e.period}</td>
                <td>{e.c1} – {e.c2}</td>
                <td>{e.entrant}</td>
                <td>{e.domBefore === e.domAfter ? `${e.domBefore}, still on top` : `${e.domBefore}, then ${e.domAfter}`}</td>
                <td className="num">{usd(e.preFare)} to {usd(e.postFare)}</td>
                <td className="num">{num(e.prePax)} to {num(e.postPax)}</td>
                <td className="num">{Math.round(e.preShare * 100)}% to {Math.round(e.postShare * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit < rows.length && <button className="button-quiet" onClick={() => setLimit((l) => l + 40)}>Show more entries</button>}
    </section>
  )
}

export default function EntryImpact({ data }) {
  return (
    <div className="view">
      <section className="lead">
        <h1 className="lead-title">The route grows. The incumbent loses.</h1>
        <p className="lead-text">
          When a low-cost airline becomes the cheapest option, fares fall {pct(ENTRY_ALL.fare).replace('−', '')} and passengers rise {pct(ENTRY_ALL.pax).replace('+', '')},
          so the route as a whole earns {pct(ENTRY_ALL.routeRev).replace('+', '')} more. The full-service airline on top loses about {pct(INCUMBENT.median).replace('−', '')} of its revenue,
          and a year later a different airline is on top in {LEADER.changed} of {LEADER.total} cases.
        </p>
      </section>

      <Estimator routes={data.routes} />

      <section className="panel">
        <h2 className="panel-title">The effect by distance</h2>
        <p className="panel-sub">Median change from the year before to the year after an entry, minus the change on similar routes where nothing happened.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Distance</th>
                <th scope="col" className="num">Entries</th>
                <th scope="col" className="num">Fare</th>
                <th scope="col" className="num">Passengers</th>
                <th scope="col" className="num">Route revenue</th>
                <th scope="col" className="num">Top airline's revenue</th>
                <th scope="col" className="num">Top airline's share</th>
              </tr>
            </thead>
            <tbody>
              {ENTRY_BY_BAND.map((b) => (
                <tr key={b.band}>
                  <td>{BAND_LABEL[b.band]}</td>
                  <td className="num">{b.events}</td>
                  <td className="num">{pct(b.fare)}</td>
                  <td className="num">{pct(b.pax)}</td>
                  <td className="num">{pct(b.routeRev)}</td>
                  <td className="num is-loss">{pct(b.topRev)}</td>
                  <td className="num">{pct(b.share).replace('%', ' pts')}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td>All entries</td>
                <td className="num">{ENTRY_ALL.events}</td>
                <td className="num">{pct(ENTRY_ALL.fare)}</td>
                <td className="num">{pct(ENTRY_ALL.pax)}</td>
                <td className="num">{pct(ENTRY_ALL.routeRev)}</td>
                <td className="num is-loss">{pct(ENTRY_ALL.topRev)}</td>
                <td className="num">{pct(ENTRY_ALL.share).replace('%', ' pts')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Top airline's revenue can belong to a different airline after the entry. Where the same airline stayed on top in all 8 quarters
          ({INCUMBENT.events} entries), its own revenue fell {pct(INCUMBENT.median).replace('−', '')} (middle half: {pct(INCUMBENT.p25)} to {pct(INCUMBENT.p75)}). That conservative figure drives revenue at risk.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Two kinds of threat</h2>
        <p className="panel-sub">Who becomes the cheapest option changes how the incumbent loses.</p>
        <div className="threats">
          {['ulcc', 'southwest'].map((k) => {
            const t = ENTRY_BY_TYPE[k]
            return (
              <article key={k} className="threat">
                <h3 className="threat-title">{t.label}</h3>
                <p className="threat-who">{k === 'ulcc' ? t.who : `${t.events} entries`}{k === 'ulcc' ? `, ${t.events} entries` : ''}</p>
                <dl className="threat-stats">
                  <div><dt>Fare</dt><dd>{pct(t.fare)}</dd></div>
                  <div><dt>Passengers</dt><dd>{pct(t.pax)}</dd></div>
                  <div><dt>Route revenue</dt><dd>{pct(t.routeRev)}</dd></div>
                  <div><dt>Incumbent's revenue</dt><dd className="is-loss">{pct(t.incumbent)}</dd></div>
                </dl>
                <p className="threat-read">
                  {k === 'ulcc'
                    ? 'Competes on price: fares drop sharply and new travellers fill the extra seats. The incumbent figure rests on only 33 entries.'
                    : 'Barely changes fares but takes passengers from the incumbent. Cutting price is unlikely to win them back.'}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <EventsTable events={data.events} />
    </div>
  )
}

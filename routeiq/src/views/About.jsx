import { INCUMBENT, LEADER } from '../lib/constants.js'

const KPIS = [
  ['Fare per mile', 'Average fare ÷ nonstop miles. Falls as distance rises, so routes are only compared inside the same distance band.'],
  ['Low-cost airline present', 'The cheapest airline on the route is Southwest, Allegiant, Frontier, Spirit, Breeze, Sun Country or Avelo. JetBlue is treated as a hybrid and tested separately.'],
  ['Benchmark fare', 'Median fare of routes with a low-cost airline cheapest, in the same distance band and quarter.'],
  ['Fare premium', '(Route fare − benchmark) ÷ benchmark.'],
  ["Top airline's revenue", 'Passengers per day × its share × its average fare × days in the quarter. An estimate: fares include taxes, fees and first class.'],
  ['Revenue at risk', `Top airline's quarterly revenue × ${Math.abs(INCUMBENT.median)}%, the median revenue loss after past low-cost entries where the same airline stayed on top.`],
]

const LIMITS = [
  'US domestic routes only. The method carries over to Canada; the numbers do not.',
  'Each route names only its largest and its cheapest airline. A low-cost airline flying at a higher fare is invisible.',
  '“Becomes the cheapest option” covers a new entry and a low-cost airline already on the route cutting fares; the data cannot separate them.',
  '193 entry events overall and 28 to 78 per distance band. Band-level figures are directional.',
  'Association, not proof of cause: low-cost airlines choose where to enter. The comparison with similar routes removes market-wide moves, not that choice.',
  'Revenue at risk is the expected loss if an entry happens, not the probability that one will.',
]

export default function About() {
  return (
    <div className="view about">
      <section className="lead">
        <h1 className="lead-title">How RouteIQ works</h1>
        <p className="lead-text">
          RouteIQ answers one question for a pricing team at a full-service airline: when a low-cost airline becomes the cheapest option on a route,
          how much revenue do we lose, and which routes are most exposed next?
        </p>
      </section>

      <section className="panel prose">
        <h2 className="panel-title">The data</h2>
        <p>
          The US Department of Transportation's <a href="https://www.transportation.gov/policy/aviation-policy/domestic-airfare-consumer-report">Domestic Airfare Consumer Report</a>,
          Table 6: every US city-pair market averaging at least 10 passengers a day, built from airline ticket data. This build covers 2019 Q1 to 2026 Q1:
          167,884 route-quarters across 8,474 routes. Row counts were reconciled against DOT's published reports and at every step of the pipeline
          (Python, then PostgreSQL). 2020 and 2021 are left out of all comparisons because of COVID.
        </p>

        <h2 className="panel-title">The method</h2>
        <ol>
          <li><strong>Premium.</strong> Compare fares on routes with no low-cost competition against low-cost routes in the same distance band and quarter.</li>
          <li><strong>Entry events.</strong> A low-cost airline becomes the cheapest option and stays so for at least 2 consecutive quarters, with 4 clean quarters before (a full-service airline cheapest) and 4 after. {LEADER.total} of {LEADER.candidates.toLocaleString()} switches pass every rule.</li>
          <li><strong>Entry effect.</strong> The change from the year before to the year after, minus the median change on similar routes over the same quarters where nothing happened (difference-in-differences).</li>
          <li><strong>Watchlist.</strong> Routes in {`2026 Q1`} with a full-service airline on top, no low-cost airline cheapest and a positive premium, ranked by revenue at risk.</li>
        </ol>
        <p>Robustness: counting JetBlue as low-cost gives an incumbent revenue effect of −5.2% instead of −5.4%; a fare-per-mile benchmark gives the same premium picture.</p>

        <h2 className="panel-title">Definitions</h2>
        <dl className="defs">
          {KPIS.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>

        <h2 className="panel-title">Limits</h2>
        <ul>
          {LIMITS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>

      <section className="panel author">
        <h2 className="panel-title">About the analyst</h2>
        <p><strong>Shubham Sarje</strong>, Data & Business Analyst, Toronto</p>
        <p><strong>Approach:</strong> Starts from the pricing decision a team has to make, then lets the data decide how confident that decision can be.</p>
        <p>
          <strong>Background:</strong> Accounting-trained (B.Com) with dual post-graduate analytics credentials (4.0 GPA, Durham College), which is why margin,
          cost structure, and profitability analysis are natural territory. Currently a Technical & Customer Experience Analyst at Transcom.
        </p>
        <p><strong>Toolkit:</strong> SQL (PostgreSQL), Power BI, Tableau, Excel (certified), Python</p>
        <p className="author-links">
          <a href="https://linkedin.com/in/shubhamsarje">LinkedIn</a>
          <a href="https://github.com/ShubhamSarje/the-competition-discount">GitHub (code and SQL)</a>
          <a href="mailto:shubham.s.sarje@gmail.com">shubham.s.sarje@gmail.com</a>
        </p>
      </section>
    </div>
  )
}

// Summary results from the SQL analysis (sql/03 to sql/07). Every number here traces to a named query.

export const LATEST_PERIOD = '2026Q1'

// 03_premium.sql, Part 3: passenger-weighted premium of no-low-cost routes vs low-cost routes, all bands
export const PREMIUM_TREND = [
  ['2019Q1', 15.0], ['2019Q2', 14.9], ['2019Q3', 15.0], ['2019Q4', 16.5],
  ['2022Q1', 18.1], ['2022Q2', 25.0], ['2022Q3', 33.2], ['2022Q4', 29.3],
  ['2023Q1', 26.3], ['2023Q2', 25.2], ['2023Q3', 23.9], ['2023Q4', 25.7],
  ['2024Q1', 22.0], ['2024Q2', 22.0], ['2024Q3', 20.0], ['2024Q4', 20.0],
  ['2025Q1', 16.4], ['2025Q2', 16.3], ['2025Q3', 21.5], ['2025Q4', 16.4],
  ['2026Q1', 12.8],
].map(([period, premium]) => ({ period, premium }))

// 03_premium.sql, Part 2
export const PREMIUM_BY_BAND = [
  { band: '0-500', route: 27.0, weighted: 14.3, min: -4.4, max: 44.5 },
  { band: '500-1000', route: 25.6, weighted: 23.7, min: 15.2, max: 32.5 },
  { band: '1000-1500', route: 21.3, weighted: 25.7, min: 15.6, max: 36.2 },
  { band: '1500+', route: 13.7, weighted: 15.1, min: 7.6, max: 22.9 },
]

// 05_entry_effect.sql, Part 1 (difference-in-differences, medians across events)
export const ENTRY_BY_BAND = [
  { band: '0-500', events: 28, fare: -4.8, pax: 14.4, routeRev: 4.2, topRev: -1.3, share: -4.6 },
  { band: '500-1000', events: 52, fare: -13.8, pax: 27.8, routeRev: 9.3, topRev: -9.8, share: -4.9 },
  { band: '1000-1500', events: 35, fare: -4.8, pax: 5.9, routeRev: 0.8, topRev: -11.0, share: -3.3 },
  { band: '1500+', events: 78, fare: -1.2, pax: -0.2, routeRev: 0.7, topRev: -9.0, share: -5.1 },
]
export const ENTRY_ALL = { events: 193, fare: -3.7, pax: 7.3, routeRev: 2.5, topRev: -9.0, share: -4.6 }

// 05_entry_effect.sql, Part 2: same airline on top in all 8 quarters
export const INCUMBENT = { median: -5.4, p25: -14.3, p75: 3.7, events: 89 }
export const RISK_RATE = 0.054

// 04_entry_events.sql, Part 2
export const LEADER = { total: 193, changed: 62, lowCostOnTop: 34, candidates: 4649, first: '2023Q1', last: '2025Q1' }

// 07_robustness.sql, Check A
export const ENTRY_BY_TYPE = {
  ulcc: {
    label: 'Ultra-low-cost airlines',
    who: 'Breeze, Frontier, Allegiant, Avelo, Spirit, Sun Country',
    events: 96, fare: -13.5, pax: 26.7, routeRev: 7.7, incumbent: -1.5, incumbentEvents: 33,
  },
  southwest: {
    label: 'Southwest',
    who: 'Southwest Airlines',
    events: 97, fare: -0.2, pax: -2.9, routeRev: -2.0, incumbent: -8.4, incumbentEvents: 56,
  },
}

export const BANDS = ['0-500', '500-1000', '1000-1500', '1500+']
export const BAND_LABEL = { '0-500': '0–500 mi', '500-1000': '500–1,000 mi', '1000-1500': '1,000–1,500 mi', '1500+': '1,500+ mi' }
export const GROUP_LABEL = { full_service: 'Full-service', low_cost: 'Low-cost', hybrid: 'Hybrid', regional_other: 'Regional' }

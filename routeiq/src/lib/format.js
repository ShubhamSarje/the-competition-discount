export const usd = (v, digits = 0) =>
  v == null ? '–' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits })

export const usdShort = (v) => {
  if (v == null) return '–'
  const a = Math.abs(v)
  if (a >= 1e9) return `${v < 0 ? '−' : ''}$${(a / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${v < 0 ? '−' : ''}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${v < 0 ? '−' : ''}$${(a / 1e3).toFixed(0)}K`
  return `${v < 0 ? '−' : ''}$${a.toFixed(0)}`
}

// signed percent from a percent value (e.g. -5.4 -> "−5.4%")
export const pct = (v, digits = 1) => {
  if (v == null || Number.isNaN(v)) return '–'
  const s = Math.abs(v).toFixed(digits)
  return v > 0 ? `+${s}%` : v < 0 ? `−${s}%` : `${s}%`
}

// signed percent from a ratio (e.g. 0.442 -> "+44.2%")
export const pctRatio = (r, digits = 1) => pct(r == null ? null : r * 100, digits)

export const num = (v, digits = 0) => (v == null ? '–' : v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }))

export const routeName = (r) => `${r.c1} – ${r.c2}`

export const usdSigned = (v) => (v > 0 ? `+${usdShort(v)}` : usdShort(v))

export const possessive = (name) => (name.endsWith('s') ? `${name}'` : `${name}'s`)

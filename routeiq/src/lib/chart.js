import { reducedMotion } from './motion.js'

// Chart colours read the theme's CSS variables, so charts follow the day/night switch.
export const C = {
  ink: 'var(--ink)',
  slate: 'var(--slate)',
  rule: 'var(--rule)',
  line: 'var(--line)',
  lowcost: 'var(--lowcost)',
  accent: 'var(--accent)',
}

export const tick = { fill: C.slate, fontSize: 12 }

export const tooltip = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 6, color: 'var(--ink)' },
  labelStyle: { color: 'var(--ink)', fontWeight: 600 },
  itemStyle: { color: 'var(--ink)' },
  cursor: { stroke: 'var(--rule)' },
}

export const lineMotion = (begin = 0) => ({ isAnimationActive: !reducedMotion(), animationBegin: begin, animationDuration: 1000, animationEasing: 'ease-in-out' })

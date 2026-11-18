import { useEffect, useRef, useState } from 'react'

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Rolls a number from its previous value to the new target (ease-out). Starts from 0 when fromZero is set.
export function useAnimatedNumber(target, { duration = 600, fromZero = false, delay = 0 } = {}) {
  const initial = fromZero && !reducedMotion() ? 0 : target
  const [value, setValue] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    if (reducedMotion()) {
      current.current = target
      setValue(target)
      return undefined
    }
    const from = current.current
    const start = performance.now() + (from === 0 && fromZero ? delay : 0)
    let raf
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration))
      const eased = 1 - Math.pow(1 - t, 4)   // ease-out quart: quick start, long soft landing
      current.current = from + (target - from) * eased
      setValue(current.current)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay, fromZero])

  return value
}

// False on the first paint, true right after: lets CSS transitions run from a starting position.
export function useReady() {
  const [ready, setReady] = useState(reducedMotion)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready
}

// A number that rolls to its new value. It re-renders only itself, so charts and
// the rest of the page stay still while it counts: that keeps every frame cheap.
export function AnimatedNumber({ value, format, duration, fromZero, delay }) {
  const v = useAnimatedNumber(value, { duration, fromZero, delay })
  return format(v)
}

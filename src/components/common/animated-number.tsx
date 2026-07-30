'use client'

import * as React from 'react'

/**
 * AnimatedNumber — counts up to a target value with easing.
 * Useful for KPI cards and score displays.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  format = (n: number) => n.toLocaleString('en-IN'),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = React.useState(0)
  const ref = React.useRef<HTMLSpanElement>(null)
  const startedRef = React.useRef(false)

  React.useEffect(() => {
    if (startedRef.current) {
      // Animate to new value
      const start = display
      const delta = value - start
      const startTs = performance.now()
      let raf = 0
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTs) / duration)
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(start + delta * eased)
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }
    startedRef.current = true
    setDisplay(value)
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  )
}

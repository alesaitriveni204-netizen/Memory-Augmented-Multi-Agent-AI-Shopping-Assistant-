'use client'

/**
 * Sparkline — a tiny inline SVG line chart for price history.
 * Color encodes trend (falling=emerald, rising=rose, stable=muted).
 */
export function Sparkline({
  data,
  width = 100,
  height = 32,
  color,
  showArea = true,
  strokeWidth = 1.5,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  strokeWidth?: number
}) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="2 2" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2

  // Normalize points to SVG coords
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y] as [number, number]
  })

  // Determine trend color
  const first = data[0]
  const last = data[data.length - 1]
  const trend = last > first * 1.03 ? 'rising' : last < first * 0.97 ? 'falling' : 'stable'
  const strokeColor =
    color ?? (trend === 'falling' ? '#4338ca' : trend === 'rising' ? '#f43f5e' : '#94a3b8')

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1][0].toFixed(1)} ${height} L ${points[0][0].toFixed(1)} ${height} Z`

  // Unique gradient id
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showArea && <path d={areaD} fill={`url(#${gradId})`} />}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End point dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2}
        fill={strokeColor}
      />
    </svg>
  )
}

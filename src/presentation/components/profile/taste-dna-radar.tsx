"use client"

import { cn } from "@/shared/utils/cn"

interface RadarAxis {
  label: string
  value: number
}

interface TasteDnaRadarProps {
  axes: RadarAxis[]
  color?: string
  size?: number
  className?: string
}

export function TasteDnaRadar({
  axes,
  color = "var(--color-primary-500)",
  size = 128,
  className,
}: TasteDnaRadarProps) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.36
  const labelOffset = 12
  const n = axes.length

  const getPoint = (index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const gridLevels = [0.33, 0.66, 1]
  const gridPaths = gridLevels.map((level) => {
    const points = Array.from({ length: n }, (_, i) => getPoint(i, radius * level))
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z"
  })

  const axisLines = Array.from({ length: n }, (_, i) => {
    const end = getPoint(i, radius)
    return `M${cx},${cy} L${end.x},${end.y}`
  })

  const dataPoints = axes.map((axis, i) => getPoint(i, radius * (axis.value / 100)))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z"

  const labelPositions = axes.map((axis, i) => {
    const p = getPoint(i, radius + labelOffset)
    return { ...p, label: axis.label }
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn("mx-auto", className)}
    >
      {/* Grid */}
      {gridPaths.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke="var(--color-neutral-200)"
          strokeWidth={0.5}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="var(--color-neutral-200)"
          strokeWidth={0.4}
        />
      ))}

      {/* Data area */}
      <path
        d={dataPath}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.4}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill={color}
        />
      ))}

      {/* Labels */}
      {labelPositions.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-neutral-500)"
          fontSize={7.5}
        >
          {p.label}
        </text>
      ))}
    </svg>
  )
}

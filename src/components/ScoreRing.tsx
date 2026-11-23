import { scoreTone } from '../domain/scoring'

const TONE: Record<string, string> = {
  bad: 'var(--color-bad)',
  mid: 'var(--color-mid)',
  good: 'var(--color-good)',
}

interface Props {
  /** Score sur 100. */
  score: number
  size?: number
  stroke?: number
  /** Couleur imposée (utilisée pour les anneaux de volet). */
  color?: string
  label?: string
  sublabel?: string
}

/** Anneau de progression : score au centre, arc proportionnel. */
export default function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  color,
  label,
  sublabel,
}: Props) {
  const clamped = Math.min(100, Math.max(0, score))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = (clamped / 100) * circumference
  const tint = color ?? TONE[scoreTone(clamped)]

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        {/* À 0 l'arc n'est pas dessiné : un bout arrondi afficherait un point trompeur. */}
        {dash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tint}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span
          className="font-semibold tabular-nums"
          style={{ fontSize: size * 0.28, color: tint }}
        >
          {Math.round(clamped)}
        </span>
        {label && <span className="mt-1 text-[11px] text-muted">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}

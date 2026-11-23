import { SCALE_MAX, type HabitResult } from '../domain/scoring'

interface Props {
  result: HabitResult
  color: string
  onChange: (value: number | undefined) => void
}

/** Une ligne de saisie, dont le contrôle dépend du type d'habitude. */
export default function HabitRow({ result, color, onChange }: Props) {
  const { habit, value, filled, ratio } = result

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[15px] leading-tight ${filled ? 'text-ink' : 'text-muted'}`}>
            {habit.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {habit.kind === 'quantity'
              ? `objectif ${formatNumber(habit.target)}${habit.unit ? ` ${habit.unit}` : ''}`
              : habit.kind === 'scale'
                ? 'note de 0 à 5'
                : 'fait / pas fait'}
            {habit.weight !== 1 && ` · poids ×${formatNumber(habit.weight)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="w-11 text-right text-[13px] font-medium tabular-nums"
            style={{ color: filled ? color : 'var(--color-muted)' }}
          >
            {filled ? `${Math.round(ratio * 100)}%` : '—'}
          </span>
          {filled && (
            <button
              type="button"
              aria-label={`Effacer ${habit.name}`}
              onClick={() => onChange(undefined)}
              className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-muted active:bg-border"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        {habit.kind === 'binary' && (
          <div className="grid grid-cols-2 gap-2">
            <Choice active={filled && value === 0} onClick={() => onChange(0)} tone="bad">
              Non
            </Choice>
            <Choice active={filled && (value ?? 0) > 0} onClick={() => onChange(1)} tone="good">
              Oui
            </Choice>
          </div>
        )}

        {habit.kind === 'scale' && (
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: SCALE_MAX + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`h-11 rounded-xl text-[15px] font-medium tabular-nums transition-colors ${
                  filled && value === n ? 'text-bg' : 'bg-surface-2 text-ink active:bg-border'
                }`}
                style={filled && value === n ? { backgroundColor: color } : undefined}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {habit.kind === 'quantity' && (
          <QuantityInput
            value={value}
            target={habit.target}
            unit={habit.unit}
            ratio={ratio}
            color={color}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  )
}

function Choice({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean
  tone: 'good' | 'bad'
  onClick: () => void
  children: React.ReactNode
}) {
  const bg = tone === 'good' ? 'var(--color-good)' : 'var(--color-bad)'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl text-[15px] font-medium transition-colors ${
        active ? 'text-bg' : 'bg-surface-2 text-ink active:bg-border'
      }`}
      style={active ? { backgroundColor: bg } : undefined}
    >
      {children}
    </button>
  )
}

function QuantityInput({
  value,
  target,
  unit,
  ratio,
  color,
  onChange,
}: {
  value: number | undefined
  target: number
  unit?: string
  ratio: number
  color: string
  onChange: (v: number | undefined) => void
}) {
  // Pas d'incrément lisible : 10 % de l'objectif, arrondi.
  const step = target > 0 ? niceStep(target / 10) : 1

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Stepper label="−" onClick={() => onChange(Math.max(0, (value ?? 0) - step))} />
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={value ?? ''}
            placeholder="0"
            min={0}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') return onChange(undefined)
              const n = Number(raw)
              onChange(Number.isFinite(n) ? Math.max(0, n) : undefined)
            }}
            className="h-11 w-full rounded-xl bg-surface-2 px-3 pr-14 text-center text-[16px] tabular-nums outline-none focus:ring-2 focus:ring-accent/60"
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              {unit}
            </span>
          )}
        </div>
        <Stepper label="+" onClick={() => onChange((value ?? 0) + step)} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Stepper({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === '+' ? 'Augmenter' : 'Diminuer'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl text-ink active:bg-border"
    >
      {label}
    </button>
  )
}

/** Arrondit un pas à une valeur « ronde » (1, 2, 5, 10, 50, 100…). */
function niceStep(n: number): number {
  if (n <= 1) return 1
  const mag = 10 ** Math.floor(Math.log10(n))
  const rest = n / mag
  const mult = rest >= 5 ? 5 : rest >= 2 ? 2 : 1
  return mult * mag
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

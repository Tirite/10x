import { useState } from 'react'
import type { CategoryResult } from '../domain/scoring'
import HabitRow from './HabitRow'

interface Props {
  result: CategoryResult
  onChange: (habitId: number, value: number | undefined) => void
  defaultOpen?: boolean
}

/** Un volet replié/déplié, avec son score et ses habitudes. */
export default function CategoryCard({ result, onChange, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { category, habits, score, filledCount, habitCount } = result

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
      >
        <span className="text-xl" aria-hidden>
          {category.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{category.name}</span>
          <span className="block text-[11px] text-muted">
            {filledCount}/{habitCount} renseignées
            {category.weight !== 1 && ` · poids ×${category.weight}`}
          </span>
        </span>
        <span
          className="text-[15px] font-semibold tabular-nums"
          style={{ color: category.color }}
        >
          {Math.round(score)}
        </span>
        <span className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>
          ›
        </span>
      </button>

      {/* Barre de score du volet, visible même replié. */}
      <div className="h-1 bg-surface-2">
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, score)}%`, backgroundColor: category.color }}
        />
      </div>

      {open && (
        <div>
          {habitCount === 0 ? (
            <p className="px-4 py-4 text-[13px] text-muted">
              Aucune habitude dans ce volet. Ajoutez-en dans Réglages.
            </p>
          ) : (
            habits.map((hr) => (
              <HabitRow
                key={hr.habit.id}
                result={hr}
                color={category.color}
                onChange={(v) => onChange(hr.habit.id as number, v)}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}

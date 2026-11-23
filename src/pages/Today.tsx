import { useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import CategoryCard from '../components/CategoryCard'
import ScoreRing from '../components/ScoreRing'
import { useAllValues, useCategories, useDay, useDayValues, useHabits } from '../db/hooks'
import { setDayNote, setValue } from '../db/queries'
import { currentStreak, scoreDay, shiftIsoDate, todayIso } from '../domain/scoring'

interface Props {
  date: string
  onDateChange: (date: string) => void
}

/** Écran de saisie d'une journée. */
export default function Today({ date, onDateChange }: Props) {
  const categories = useCategories()
  const habits = useHabits()
  const values = useDayValues(date)
  const day = useDay(date)
  const allValues = useAllValues()

  const result = useMemo(
    () => scoreDay(date, categories, habits, values),
    [date, categories, habits, values],
  )

  // Scores de tout l'historique : nécessaires pour la série en cours.
  const streak = useMemo(() => {
    const scores = new Map<string, number>()
    for (const [d, v] of allValues) scores.set(d, scoreDay(d, categories, habits, v).total)
    return currentStreak(scores, date)
  }, [allValues, categories, habits, date])

  const isToday = date === todayIso()
  const isFuture = date > todayIso()

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Navigation entre les jours */}
      <div className="flex items-center justify-between">
        <NavBtn label="‹" onClick={() => onDateChange(shiftIsoDate(date, -1))} />
        <div className="text-center">
          <p className="text-[15px] font-medium capitalize">
            {format(new Date(`${date}T12:00:00`), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(todayIso())}
              className="mt-0.5 text-[12px] text-accent"
            >
              revenir à aujourd’hui
            </button>
          )}
        </div>
        <NavBtn
          label="›"
          disabled={isFuture}
          onClick={() => onDateChange(shiftIsoDate(date, 1))}
        />
      </div>

      {/* Score global du jour */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <ScoreRing score={result.total} size={104} label="score du jour" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Stat label="Habitudes renseignées" value={`${result.filledCount}/${result.habitCount}`} />
          <Stat label="Volets" value={String(result.categories.filter((c) => c.habitCount > 0).length)} />
          <Stat
            label="Série ≥ 70"
            value={streak > 0 ? `${streak} jour${streak > 1 ? 's' : ''}` : '—'}
          />
        </div>
      </div>

      {result.categories.map((c) => (
        <CategoryCard
          key={c.category.id}
          result={c}
          onChange={(habitId, value) => void setValue(date, habitId, value)}
        />
      ))}

      {/* Note libre de la journée */}
      <label className="block rounded-2xl border border-border bg-surface p-4">
        <span className="text-[12px] text-muted">Note du jour</span>
        <textarea
          value={day?.note ?? ''}
          onChange={(e) => void setDayNote(date, e.target.value)}
          rows={3}
          placeholder="Ce qui a marché, ce qui a bloqué…"
          className="mt-2 w-full resize-none rounded-xl bg-surface-2 p-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/60"
        />
      </label>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="truncate text-[12px] text-muted">{label}</span>
      <span className="shrink-0 text-[14px] font-medium tabular-nums">{value}</span>
    </div>
  )
}

function NavBtn({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === '‹' ? 'Jour précédent' : 'Jour suivant'}
      className="grid h-11 w-11 place-items-center rounded-full bg-surface text-xl text-ink disabled:opacity-30 active:bg-surface-2"
    >
      {label}
    </button>
  )
}

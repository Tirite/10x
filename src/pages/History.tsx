import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ScoreRing from '../components/ScoreRing'
import { useAllValues, useCategories, useHabits } from '../db/hooks'
import { bestStreak, currentStreak, scoreDay, shiftIsoDate, todayIso } from '../domain/scoring'

const RANGES = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
] as const

interface Props {
  onOpenDay: (date: string) => void
}

/** Évolution du score : courbe globale, courbes par volet, séries. */
export default function History({ onOpenDay }: Props) {
  const categories = useCategories()
  const habits = useHabits()
  const allValues = useAllValues()
  const [range, setRange] = useState<number>(30)
  const [perCategory, setPerCategory] = useState(false)

  const active = useMemo(
    () => categories.filter((c) => !c.archived),
    [categories],
  )

  // Scores de toutes les journées saisies (pour les séries et les moyennes).
  const scores = useMemo(() => {
    const map = new Map<string, number>()
    for (const [date, values] of allValues) {
      map.set(date, scoreDay(date, categories, habits, values).total)
    }
    return map
  }, [allValues, categories, habits])

  // Série continue de dates, même sans saisie : la courbe ne doit pas mentir
  // sur les jours manquants (valeur `null` = trou visible).
  const data = useMemo(() => {
    const today = todayIso()
    const rows: Record<string, number | string | null>[] = []
    for (let i = range - 1; i >= 0; i--) {
      const date = shiftIsoDate(today, -i)
      const values = allValues.get(date)
      const row: Record<string, number | string | null> = {
        date,
        jour: format(new Date(`${date}T12:00:00`), range <= 7 ? 'EEE' : 'dd/MM', { locale: fr }),
        total: values ? scoreDay(date, categories, habits, values).total : null,
      }
      if (values) {
        const day = scoreDay(date, categories, habits, values)
        for (const c of day.categories) row[`c${c.category.id}`] = c.habitCount ? c.score : null
      } else {
        for (const c of active) row[`c${c.id}`] = null
      }
      rows.push(row)
    }
    return rows
  }, [range, allValues, categories, habits, active])

  const filled = data.filter((r) => typeof r.total === 'number') as { total: number }[]
  const average = filled.length
    ? Math.round(filled.reduce((s, r) => s + r.total, 0) / filled.length)
    : 0

  return (
    <div className="space-y-3 px-4 pb-4">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <ScoreRing score={average} size={96} label={`moyenne ${range} j`} />
        <div className="min-w-0 flex-1 space-y-1.5 text-[13px]">
          <Line2 label="Jours renseignés" value={`${filled.length}/${range}`} />
          <Line2 label="Série en cours" value={`${currentStreak(scores, todayIso())} j`} />
          <Line2 label="Meilleure série" value={`${bestStreak(scores)} j`} />
          <Line2 label="Total enregistré" value={`${scores.size} j`} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              className={`h-9 rounded-lg px-3 text-[13px] ${
                range === r.days ? 'bg-accent text-white' : 'text-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPerCategory((v) => !v)}
          className={`ml-auto h-9 rounded-xl px-3 text-[13px] ${
            perCategory ? 'bg-accent text-white' : 'bg-surface text-muted'
          }`}
        >
          Par volet
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-2 pt-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="jour"
                tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={16}
                stroke="var(--color-border)"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                stroke="var(--color-border)"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--color-muted)' }}
                formatter={(v: number) => `${Math.round(v)}`}
              />
              {perCategory && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {perCategory ? (
                active.map((c) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={`c${c.id}`}
                    name={c.name}
                    stroke={c.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Score du jour"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <h2 className="px-4 pb-1 pt-3 text-[13px] font-medium uppercase tracking-wide text-muted">
          Journées
        </h2>
        {[...scores.keys()].sort().reverse().slice(0, 60).length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-muted">
            Aucune journée enregistrée pour le moment.
          </p>
        ) : (
          [...scores.keys()]
            .sort()
            .reverse()
            .slice(0, 60)
            .map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => onOpenDay(date)}
                className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left active:bg-surface-2"
              >
                <span className="flex-1 text-[14px] capitalize">
                  {format(new Date(`${date}T12:00:00`), 'EEEE d MMM yyyy', { locale: fr })}
                </span>
                <span className="w-24 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-1.5 rounded-full"
                    style={{
                      width: `${scores.get(date)}%`,
                      backgroundColor: toneColor(scores.get(date) as number),
                    }}
                  />
                </span>
                <span
                  className="w-8 text-right text-[14px] font-medium tabular-nums"
                  style={{ color: toneColor(scores.get(date) as number) }}
                >
                  {Math.round(scores.get(date) as number)}
                </span>
              </button>
            ))
        )}
      </section>
    </div>
  )
}

function Line2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="truncate text-muted">{label}</span>
      <span className="shrink-0 font-medium tabular-nums">{value}</span>
    </div>
  )
}

function toneColor(score: number): string {
  if (score < 50) return 'var(--color-bad)'
  if (score < 80) return 'var(--color-mid)'
  return 'var(--color-good)'
}

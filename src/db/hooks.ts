import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './schema'
import type { Category, DayEntry, DayValues, Habit, ScoreRow } from '../domain/types'
import { byOrder } from '../domain/scoring'

/** Tous les volets, archivés compris, triés par ordre d'affichage. */
export function useCategories(): Category[] {
  return (
    useLiveQuery(async () => (await db.categories.toArray()).sort(byOrder), [], undefined) ?? []
  )
}

/** Toutes les habitudes, archivées comprises. */
export function useHabits(): Habit[] {
  return useLiveQuery(async () => (await db.habits.toArray()).sort(byOrder), [], undefined) ?? []
}

/** Valeurs saisies pour une journée. */
export function useDayValues(date: string): DayValues {
  return (
    useLiveQuery(
      async () => {
        const rows = await db.scores.where('date').equals(date).toArray()
        const values: DayValues = {}
        for (const r of rows) values[r.habitId] = r.value
        return values
      },
      [date],
      undefined,
    ) ?? {}
  )
}

export function useDay(date: string): DayEntry | undefined {
  return useLiveQuery(() => db.days.get(date), [date], undefined)
}

/** Historique complet, indexé par date. */
export function useAllValues(): Map<string, DayValues> {
  return (
    useLiveQuery(
      async () => {
        const rows = await db.scores.toArray()
        const map = new Map<string, DayValues>()
        for (const r of rows) {
          const day = map.get(r.date) ?? {}
          day[r.habitId] = r.value
          map.set(r.date, day)
        }
        return map
      },
      [],
      undefined,
    ) ?? new Map<string, DayValues>()
  )
}

export function useAllDays(): DayEntry[] {
  return useLiveQuery(() => db.days.toArray(), [], undefined) ?? []
}

export function useAllScores(): ScoreRow[] {
  return useLiveQuery(() => db.scores.toArray(), [], undefined) ?? []
}

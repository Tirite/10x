import type { Category, DayValues, Habit } from './types'

export const SCALE_MAX = 5

export interface HabitResult {
  habit: Habit
  value: number | undefined
  /** Taux de réalisation, borné à [0, 1]. */
  ratio: number
  /** Faux si rien n'a été saisi (distinct d'un « non fait » volontaire). */
  filled: boolean
}

export interface CategoryResult {
  category: Category
  habits: HabitResult[]
  /** Score du volet sur 100. */
  score: number
  filledCount: number
  habitCount: number
}

export interface DayResult {
  date: string
  categories: CategoryResult[]
  /** Score de la journée sur 100. */
  total: number
  filledCount: number
  habitCount: number
}

/**
 * Taux de réalisation d'une habitude pour une valeur brute.
 * Une valeur absente ou non finie vaut 0 ; le résultat est toujours dans [0, 1].
 */
export function ratioFor(habit: Habit, value: number | undefined): number {
  if (value === undefined || value === null || !Number.isFinite(value)) return 0
  switch (habit.kind) {
    case 'binary':
      return value > 0 ? 1 : 0
    case 'scale':
      return clamp01(value / SCALE_MAX)
    case 'quantity': {
      // Un objectif absent ou nul rend le ratio indéfinissable : on retient
      // « fait » dès qu'une quantité positive est saisie.
      if (!habit.target || habit.target <= 0) return value > 0 ? 1 : 0
      return clamp01(value / habit.target)
    }
  }
}

/** Moyenne pondérée sur 100 ; renvoie 0 si la somme des poids est nulle. */
function weightedPercent(items: { ratio: number; weight: number }[]): number {
  let num = 0
  let den = 0
  for (const it of items) {
    const w = sanitizeWeight(it.weight)
    num += w * clamp01(it.ratio)
    den += w
  }
  return den > 0 ? round2((num / den) * 100) : 0
}

/** Score d'un volet à partir de ses habitudes actives et des valeurs du jour. */
export function scoreCategory(
  category: Category,
  habits: Habit[],
  values: DayValues,
): CategoryResult {
  const active = habits
    .filter((h) => h.categoryId === category.id && !h.archived)
    .sort(byOrder)

  const results: HabitResult[] = active.map((habit) => {
    const value = values[habit.id as number]
    const filled = value !== undefined && value !== null && Number.isFinite(value)
    return { habit, value: filled ? value : undefined, ratio: ratioFor(habit, value), filled }
  })

  return {
    category,
    habits: results,
    score: weightedPercent(results.map((r) => ({ ratio: r.ratio, weight: r.habit.weight }))),
    filledCount: results.filter((r) => r.filled).length,
    habitCount: results.length,
  }
}

/**
 * Score complet d'une journée.
 * Les volets sans habitude active sont exclus du total : ils ne doivent pas le tirer vers 0.
 */
export function scoreDay(
  date: string,
  categories: Category[],
  habits: Habit[],
  values: DayValues,
): DayResult {
  const results = categories
    .filter((c) => !c.archived)
    .sort(byOrder)
    .map((c) => scoreCategory(c, habits, values))

  const counted = results.filter((r) => r.habitCount > 0)

  return {
    date,
    categories: results,
    total: weightedPercent(
      counted.map((r) => ({ ratio: r.score / 100, weight: r.category.weight })),
    ),
    filledCount: results.reduce((n, r) => n + r.filledCount, 0),
    habitCount: results.reduce((n, r) => n + r.habitCount, 0),
  }
}

/**
 * Série en cours : nombre de jours consécutifs, en remontant depuis `from`,
 * dont le score atteint `threshold`. `scores` associe une date à son score.
 */
export function currentStreak(
  scores: Map<string, number>,
  from: string,
  threshold = 70,
): number {
  let streak = 0
  let cursor = from
  // Limite de sécurité : 10 ans.
  for (let i = 0; i < 3660; i++) {
    const score = scores.get(cursor)
    if (score === undefined || score < threshold) break
    streak++
    cursor = shiftIsoDate(cursor, -1)
  }
  return streak
}

/** Meilleure série observée dans l'ensemble des scores fournis. */
export function bestStreak(scores: Map<string, number>, threshold = 70): number {
  const dates = [...scores.keys()].sort()
  let best = 0
  let run = 0
  let prev: string | undefined
  for (const d of dates) {
    const ok = (scores.get(d) ?? 0) >= threshold
    if (!ok) {
      run = 0
      prev = d
      continue
    }
    run = prev !== undefined && shiftIsoDate(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Couleur d'un score : rouge < 50, orange < 80, vert au-delà. */
export function scoreTone(score: number): 'bad' | 'mid' | 'good' {
  if (score < 50) return 'bad'
  if (score < 80) return 'mid'
  return 'good'
}

export function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order
}

/** Décale une date ISO (« 2026-11-23 ») d'un nombre de jours, en UTC. */
export function shiftIsoDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Date du jour en heure locale, au format ISO court. */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function sanitizeWeight(w: number): number {
  return Number.isFinite(w) && w > 0 ? w : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

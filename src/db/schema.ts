import Dexie, { type EntityTable } from 'dexie'
import type { Category, DayEntry, Habit, ScoreRow, Setting } from '../domain/types'

export const SCHEMA_VERSION = 1

/**
 * Base locale (IndexedDB). Tout reste sur le téléphone : aucune requête réseau.
 */
export class AppDb extends Dexie {
  categories!: EntityTable<Category, 'id'>
  habits!: EntityTable<Habit, 'id'>
  scores!: EntityTable<ScoreRow, 'id'>
  days!: EntityTable<DayEntry, 'date'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('app10x')
    this.version(1).stores({
      categories: '++id, order, archived',
      habits: '++id, categoryId, order, archived',
      // `[date+habitId]` : une seule valeur par habitude et par jour.
      scores: '++id, date, habitId, &[date+habitId]',
      days: 'date',
      settings: 'key',
    })
  }
}

export const db = new AppDb()

/** Volets et habitudes proposés au premier lancement — tous modifiables dans Réglages. */
export const DEFAULT_DATA: { category: Omit<Category, 'id'>; habits: Omit<Habit, 'id' | 'categoryId'>[] }[] = [
  {
    category: { name: 'Spirituel', icon: '🕌', color: '#8b5cf6', weight: 2, order: 0, archived: 0 },
    habits: [
      { name: 'Prières à l\u2019heure', kind: 'scale', target: 0, weight: 3, order: 0, archived: 0 },
      { name: 'Lecture du Coran', kind: 'quantity', target: 5, unit: 'pages', weight: 2, order: 1, archived: 0 },
      { name: 'Invocations matin/soir', kind: 'binary', target: 0, weight: 1, order: 2, archived: 0 },
    ],
  },
  {
    category: { name: 'Sportif', icon: '🏃', color: '#10b981', weight: 1.5, order: 1, archived: 0 },
    habits: [
      { name: 'Séance de sport', kind: 'binary', target: 0, weight: 3, order: 0, archived: 0 },
      { name: 'Pas', kind: 'quantity', target: 8000, unit: 'pas', weight: 2, order: 1, archived: 0 },
      { name: 'Étirements', kind: 'binary', target: 0, weight: 1, order: 2, archived: 0 },
    ],
  },
  {
    category: { name: 'Professionnel', icon: '💼', color: '#3b82f6', weight: 2, order: 2, archived: 0 },
    habits: [
      { name: 'Tâche prioritaire du jour', kind: 'binary', target: 0, weight: 3, order: 0, archived: 0 },
      { name: 'Travail concentré', kind: 'quantity', target: 180, unit: 'min', weight: 2, order: 1, archived: 0 },
      { name: 'Boîte mail traitée', kind: 'binary', target: 0, weight: 1, order: 2, archived: 0 },
    ],
  },
  {
    category: { name: 'Santé', icon: '🩺', color: '#f59e0b', weight: 1, order: 3, archived: 0 },
    habits: [
      { name: 'Sommeil', kind: 'quantity', target: 7, unit: 'h', weight: 3, order: 0, archived: 0 },
      { name: 'Eau', kind: 'quantity', target: 8, unit: 'verres', weight: 2, order: 1, archived: 0 },
      { name: 'Alimentation maîtrisée', kind: 'scale', target: 0, weight: 2, order: 2, archived: 0 },
    ],
  },
  {
    category: { name: 'Famille', icon: '🏡', color: '#ec4899', weight: 1.5, order: 4, archived: 0 },
    habits: [
      { name: 'Temps de qualité', kind: 'scale', target: 0, weight: 3, order: 0, archived: 0 },
      { name: 'Appel aux parents', kind: 'binary', target: 0, weight: 2, order: 1, archived: 0 },
    ],
  },
  {
    category: { name: 'Apprentissage', icon: '📚', color: '#06b6d4', weight: 1, order: 5, archived: 0 },
    habits: [
      { name: 'Lecture', kind: 'quantity', target: 20, unit: 'min', weight: 2, order: 0, archived: 0 },
      { name: 'Formation / cours', kind: 'binary', target: 0, weight: 2, order: 1, archived: 0 },
    ],
  },
]

/** Crée les données par défaut au premier lancement (idempotent). */
export async function ensureSeed(): Promise<void> {
  const already = await db.categories.count()
  if (already > 0) return

  await db.transaction('rw', db.categories, db.habits, db.settings, async () => {
    for (const block of DEFAULT_DATA) {
      const categoryId = (await db.categories.add(block.category as Category)) as number
      await db.habits.bulkAdd(
        block.habits.map((h) => ({ ...h, categoryId }) as Habit),
      )
    }
    await db.settings.put({ key: 'schemaVersion', value: SCHEMA_VERSION })
    await db.settings.put({ key: 'createdAt', value: Date.now() })
  })
}

/** Remet la base dans son état initial (utilisé par Réglages → réinitialiser). */
export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.categories, db.habits, db.scores, db.days, db.settings, async () => {
    await Promise.all([
      db.categories.clear(),
      db.habits.clear(),
      db.scores.clear(),
      db.days.clear(),
      db.settings.clear(),
    ])
  })
  await ensureSeed()
}

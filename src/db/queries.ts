import { db } from './schema'
import type { Category, DayValues, Habit } from '../domain/types'

/** Enregistre (ou efface) la valeur d'une habitude pour une date. */
export async function setValue(
  date: string,
  habitId: number,
  value: number | undefined,
): Promise<void> {
  await db.transaction('rw', db.scores, db.days, async () => {
    const existing = await db.scores.where({ date, habitId }).first()
    if (value === undefined || !Number.isFinite(value)) {
      if (existing?.id !== undefined) await db.scores.delete(existing.id)
    } else if (existing?.id !== undefined) {
      await db.scores.update(existing.id, { value })
    } else {
      await db.scores.add({ date, habitId, value })
    }
    await touchDay(date)
  })
}

/** Note libre de la journée. */
export async function setDayNote(date: string, note: string): Promise<void> {
  const now = Date.now()
  const existing = await db.days.get(date)
  await db.days.put({
    date,
    note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}

async function touchDay(date: string): Promise<void> {
  const now = Date.now()
  const existing = await db.days.get(date)
  await db.days.put({
    date,
    note: existing?.note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}

/** Valeurs saisies pour une journée, prêtes pour `scoreDay`. */
export async function getDayValues(date: string): Promise<DayValues> {
  const rows = await db.scores.where('date').equals(date).toArray()
  const values: DayValues = {}
  for (const r of rows) values[r.habitId] = r.value
  return values
}

/** Valeurs de toutes les journées, indexées par date (pour l'historique et l'export). */
export async function getAllValuesByDate(): Promise<Map<string, DayValues>> {
  const rows = await db.scores.toArray()
  const map = new Map<string, DayValues>()
  for (const r of rows) {
    const day = map.get(r.date) ?? {}
    day[r.habitId] = r.value
    map.set(r.date, day)
  }
  return map
}

// ---------------------------------------------------------------- volets

export async function addCategory(partial?: Partial<Category>): Promise<number> {
  const max = await db.categories.orderBy('order').last()
  return (await db.categories.add({
    name: partial?.name ?? 'Nouveau volet',
    icon: partial?.icon ?? '⭐',
    color: partial?.color ?? '#6366f1',
    weight: partial?.weight ?? 1,
    order: (max?.order ?? -1) + 1,
    archived: 0,
  } as Category)) as number
}

export async function updateCategory(id: number, patch: Partial<Category>): Promise<void> {
  await db.categories.update(id, patch)
}

/**
 * Archive un volet et ses habitudes : l'historique déjà saisi reste intact,
 * contrairement à une suppression.
 */
export async function archiveCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, db.habits, async () => {
    await db.categories.update(id, { archived: 1 })
    const habits = await db.habits.where('categoryId').equals(id).toArray()
    await Promise.all(
      habits.map((h) => db.habits.update(h.id as number, { archived: 1 as const })),
    )
  })
}

export async function restoreCategory(id: number): Promise<void> {
  await db.categories.update(id, { archived: 0 })
}

/** Supprime définitivement un volet, ses habitudes et toutes leurs valeurs. */
export async function deleteCategoryForever(id: number): Promise<void> {
  await db.transaction('rw', db.categories, db.habits, db.scores, async () => {
    const habits = await db.habits.where('categoryId').equals(id).toArray()
    for (const h of habits) {
      await db.scores.where('habitId').equals(h.id as number).delete()
      await db.habits.delete(h.id as number)
    }
    await db.categories.delete(id)
  })
}

// ------------------------------------------------------------ habitudes

export async function addHabit(categoryId: number, partial?: Partial<Habit>): Promise<number> {
  const siblings = await db.habits.where('categoryId').equals(categoryId).toArray()
  const order = siblings.reduce((m, h) => Math.max(m, h.order), -1) + 1
  return (await db.habits.add({
    categoryId,
    name: partial?.name ?? 'Nouvelle habitude',
    kind: partial?.kind ?? 'binary',
    target: partial?.target ?? 0,
    unit: partial?.unit,
    weight: partial?.weight ?? 1,
    order,
    archived: 0,
  } as Habit)) as number
}

export async function updateHabit(id: number, patch: Partial<Habit>): Promise<void> {
  await db.habits.update(id, patch)
}

export async function archiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { archived: 1 })
}

export async function restoreHabit(id: number): Promise<void> {
  await db.habits.update(id, { archived: 0 })
}

export async function deleteHabitForever(id: number): Promise<void> {
  await db.transaction('rw', db.habits, db.scores, async () => {
    await db.scores.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

/** Déplace un élément d'un cran dans sa liste (échange des `order`). */
export async function moveItem(
  table: 'categories' | 'habits',
  id: number,
  direction: -1 | 1,
): Promise<void> {
  const t = table === 'categories' ? db.categories : db.habits
  const all = await t.toArray()
  const item = all.find((x) => x.id === id)
  if (!item) return
  const siblings = all
    .filter((x) =>
      table === 'habits'
        ? (x as Habit).categoryId === (item as Habit).categoryId && !x.archived
        : !x.archived,
    )
    .sort((a, b) => a.order - b.order)
  const index = siblings.findIndex((x) => x.id === id)
  const target = siblings[index + direction]
  if (!target) return
  await t.update(id, { order: target.order })
  await t.update(target.id as number, { order: item.order })
}

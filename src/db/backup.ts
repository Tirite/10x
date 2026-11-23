import { db, SCHEMA_VERSION } from './schema'
import { buildBackup, parseBackup } from '../domain/export'

/** Sérialise l'intégralité de la base. */
export async function exportBackup(): Promise<string> {
  const [categories, habits, scores, days] = await Promise.all([
    db.categories.toArray(),
    db.habits.toArray(),
    db.scores.toArray(),
    db.days.toArray(),
  ])
  return buildBackup({ schemaVersion: SCHEMA_VERSION, categories, habits, scores, days })
}

export interface ImportReport {
  categories: number
  habits: number
  scores: number
  days: number
}

/**
 * Restaure une sauvegarde. La base est entièrement remplacée : les
 * identifiants sont conservés pour que les valeurs restent liées à leurs
 * habitudes. Le fichier est validé avant toute écriture.
 */
export async function importBackup(text: string): Promise<ImportReport> {
  const backup = parseBackup(text)

  await db.transaction('rw', db.categories, db.habits, db.scores, db.days, db.settings, async () => {
    await Promise.all([
      db.categories.clear(),
      db.habits.clear(),
      db.scores.clear(),
      db.days.clear(),
    ])
    await db.categories.bulkAdd(backup.categories)
    await db.habits.bulkAdd(backup.habits)
    await db.scores.bulkAdd(backup.scores)
    await db.days.bulkAdd(backup.days)
    await db.settings.put({ key: 'schemaVersion', value: SCHEMA_VERSION })
    await db.settings.put({ key: 'importedAt', value: Date.now() })
  })

  return {
    categories: backup.categories.length,
    habits: backup.habits.length,
    scores: backup.scores.length,
    days: backup.days.length,
  }
}

/** Espace occupé par la base, tel que le rapporte le navigateur. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | undefined> {
  if (!navigator.storage?.estimate) return undefined
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}

/**
 * Demande le stockage persistant : iOS n'efface pas les données d'une PWA
 * installée sur l'écran d'accueil, mais l'appel ne coûte rien et protège
 * la consultation depuis Safari.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted?.()) return true
  return navigator.storage.persist()
}

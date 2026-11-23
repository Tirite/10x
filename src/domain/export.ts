import { scoreDay } from './scoring'
import type { Category, DayEntry, DayValues, Habit, ScoreRow } from './types'

/** Excel francophone attend un point-virgule et un BOM UTF-8. */
const SEP = ';'
const BOM = '\ufeff'

function cell(value: unknown): string {
  if (value === undefined || value === null) return ''
  const s = String(value)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function row(values: unknown[]): string {
  return values.map(cell).join(SEP)
}

/** Nombre à la française (virgule décimale) pour un collage direct dans Excel. */
function num(n: number, digits = 2): string {
  return n.toFixed(digits).replace('.', ',')
}

export interface ExportInput {
  categories: Category[]
  habits: Habit[]
  valuesByDate: Map<string, DayValues>
  days?: DayEntry[]
}

/**
 * Export détaillé : une ligne par habitude et par jour.
 * Format long, le plus souple pour un tableau croisé dynamique.
 */
export function buildDetailCsv({ categories, habits, valuesByDate }: ExportInput): string {
  const lines = [
    row([
      'date',
      'volet',
      'poids_volet',
      'habitude',
      'type',
      'valeur',
      'objectif',
      'unite',
      'poids_habitude',
      'taux_pct',
      'score_volet',
      'score_jour',
    ]),
  ]

  for (const date of [...valuesByDate.keys()].sort()) {
    const values = valuesByDate.get(date) as DayValues
    const day = scoreDay(date, categories, habits, values)
    for (const cat of day.categories) {
      for (const hr of cat.habits) {
        lines.push(
          row([
            date,
            cat.category.name,
            num(cat.category.weight, 2),
            hr.habit.name,
            hr.habit.kind,
            hr.filled ? num(hr.value as number, 2) : '',
            hr.habit.kind === 'quantity' ? num(hr.habit.target, 2) : '',
            hr.habit.unit ?? '',
            num(hr.habit.weight, 2),
            num(hr.ratio * 100, 1),
            num(cat.score, 1),
            num(day.total, 1),
          ]),
        )
      }
    }
  }
  return BOM + lines.join('\r\n') + '\r\n'
}

/** Export récapitulatif : une ligne par jour, une colonne par volet. */
export function buildSummaryCsv({ categories, habits, valuesByDate, days }: ExportInput): string {
  const active = categories.filter((c) => !c.archived).sort((a, b) => a.order - b.order)
  const notes = new Map((days ?? []).map((d) => [d.date, d.note ?? '']))
  const lines = [
    row([
      'date',
      ...active.map((c) => c.name),
      'score_jour',
      'habitudes_renseignees',
      'habitudes_total',
      'note',
    ]),
  ]

  for (const date of [...valuesByDate.keys()].sort()) {
    const day = scoreDay(date, categories, habits, valuesByDate.get(date) as DayValues)
    const byId = new Map(day.categories.map((c) => [c.category.id, c.score]))
    lines.push(
      row([
        date,
        ...active.map((c) => num(byId.get(c.id) ?? 0, 1)),
        num(day.total, 1),
        day.filledCount,
        day.habitCount,
        notes.get(date) ?? '',
      ]),
    )
  }
  return BOM + lines.join('\r\n') + '\r\n'
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Export XML, utile pour une relecture par un autre outil. */
export function buildXml({ categories, habits, valuesByDate }: ExportInput): string {
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<journal app="10x">']
  for (const date of [...valuesByDate.keys()].sort()) {
    const day = scoreDay(date, categories, habits, valuesByDate.get(date) as DayValues)
    out.push(`  <jour date="${date}" score="${day.total.toFixed(1)}">`)
    for (const cat of day.categories) {
      out.push(
        `    <volet nom="${xmlEscape(cat.category.name)}" poids="${cat.category.weight}" score="${cat.score.toFixed(1)}">`,
      )
      for (const hr of cat.habits) {
        out.push(
          `      <habitude nom="${xmlEscape(hr.habit.name)}" type="${hr.habit.kind}"` +
            ` poids="${hr.habit.weight}" valeur="${hr.filled ? hr.value : ''}"` +
            ` objectif="${hr.habit.kind === 'quantity' ? hr.habit.target : ''}"` +
            ` taux="${(hr.ratio * 100).toFixed(1)}" />`,
        )
      }
      out.push('    </volet>')
    }
    out.push('  </jour>')
  }
  out.push('</journal>')
  return out.join('\n') + '\n'
}

// ------------------------------------------------------- sauvegarde JSON

export interface Backup {
  app: 'app10x'
  schemaVersion: number
  exportedAt: string
  categories: Category[]
  habits: Habit[]
  scores: ScoreRow[]
  days: DayEntry[]
}

export function buildBackup(data: Omit<Backup, 'app' | 'exportedAt'>): string {
  const backup: Backup = {
    app: 'app10x',
    exportedAt: new Date().toISOString(),
    ...data,
  }
  return JSON.stringify(backup, null, 2)
}

/** Valide une sauvegarde relue depuis un fichier avant toute écriture en base. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Fichier illisible : ce n’est pas du JSON.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== 'app10x') throw new Error('Ce fichier ne provient pas de l’application 10x.')
  for (const key of ['categories', 'habits', 'scores', 'days'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Sauvegarde incomplète : « ${key} » manquant.`)
  }
  return b as Backup
}

/**
 * Propose le fichier à l'utilisateur. Sur iOS la feuille de partage permet
 * l'envoi par AirDrop vers le PC ou l'enregistrement dans Fichiers ;
 * ailleurs on retombe sur un téléchargement classique.
 */
export async function saveFile(filename: string, mime: string, content: string): Promise<void> {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const file = new File([blob], filename, { type: mime })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (err) {
      // Partage annulé par l'utilisateur : on ne force pas le téléchargement.
      if ((err as DOMException)?.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function stamp(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

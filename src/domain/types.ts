/** Mode de notation d'une habitude. */
export type HabitKind =
  /** Fait / pas fait. */
  | 'binary'
  /** Échelle de 0 à 5 (qualité de réalisation). */
  | 'scale'
  /** Quantité à comparer à un objectif (pages lues, pas, minutes…). */
  | 'quantity'

/** Volet de la journée : spirituel, sportif, professionnel… */
export interface Category {
  id?: number
  name: string
  /** Emoji affiché devant le nom. */
  icon: string
  /** Couleur hexadécimale utilisée dans les graphiques. */
  color: string
  /** Poids du volet dans le score global (1 = normal). */
  weight: number
  order: number
  /** 0/1 et non un booléen : IndexedDB n'indexe pas les booléens. */
  archived: 0 | 1
}

export interface Habit {
  id?: number
  categoryId: number
  name: string
  kind: HabitKind
  /** Objectif pour `quantity` (ignoré sinon). */
  target: number
  /** Unité affichée pour `quantity` (« pages », « min », « pas »…). */
  unit?: string
  /** Poids de l'habitude au sein de son volet. */
  weight: number
  order: number
  archived: 0 | 1
}

/** Valeur saisie pour une habitude un jour donné. */
export interface ScoreRow {
  id?: number
  /** Format ISO court, ex. « 2026-11-23 ». */
  date: string
  habitId: number
  value: number
}

/** Une journée (note libre et horodatage) ; la clé primaire est la date. */
export interface DayEntry {
  date: string
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Setting {
  key: string
  value: unknown
}

/** Valeurs saisies d'une journée, indexées par identifiant d'habitude. */
export type DayValues = Record<number, number | undefined>

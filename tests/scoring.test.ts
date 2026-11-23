import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  currentStreak,
  ratioFor,
  scoreCategory,
  scoreDay,
  shiftIsoDate,
  todayIso,
} from '../src/domain/scoring'
import type { Category, Habit } from '../src/domain/types'

function cat(id: number, over: Partial<Category> = {}): Category {
  return {
    id,
    name: `Volet ${id}`,
    icon: '*',
    color: '#ffffff',
    weight: 1,
    order: id,
    archived: 0,
    ...over,
  }
}

function habit(id: number, categoryId: number, over: Partial<Habit> = {}): Habit {
  return {
    id,
    categoryId,
    name: `Habitude ${id}`,
    kind: 'binary',
    target: 0,
    weight: 1,
    order: id,
    archived: 0,
    ...over,
  }
}

describe('ratioFor', () => {
  it('traite le binaire comme 0 ou 1', () => {
    const h = habit(1, 1, { kind: 'binary' })
    expect(ratioFor(h, 1)).toBe(1)
    expect(ratioFor(h, 0)).toBe(0)
  })

  it('ramene l echelle 0-5 sur [0,1] et borne les debordements', () => {
    const h = habit(1, 1, { kind: 'scale' })
    expect(ratioFor(h, 0)).toBe(0)
    expect(ratioFor(h, 3)).toBeCloseTo(0.6)
    expect(ratioFor(h, 5)).toBe(1)
    expect(ratioFor(h, 9)).toBe(1)
  })

  it('plafonne une quantite au-dela de l objectif', () => {
    const h = habit(1, 1, { kind: 'quantity', target: 8000 })
    expect(ratioFor(h, 4000)).toBeCloseTo(0.5)
    expect(ratioFor(h, 12000)).toBe(1)
  })

  it('retombe sur fait / pas fait si l objectif est nul', () => {
    const h = habit(1, 1, { kind: 'quantity', target: 0 })
    expect(ratioFor(h, 3)).toBe(1)
    expect(ratioFor(h, 0)).toBe(0)
  })

  it('vaut 0 pour une valeur absente ou non numerique', () => {
    const h = habit(1, 1, { kind: 'scale' })
    expect(ratioFor(h, undefined)).toBe(0)
    expect(ratioFor(h, Number.NaN)).toBe(0)
  })
})

describe('scoreCategory', () => {
  it('pondere les habitudes entre elles', () => {
    const habits = [habit(1, 1, { weight: 3 }), habit(2, 1, { weight: 1 })]
    const res = scoreCategory(cat(1), habits, { 1: 1 })
    expect(res.score).toBe(75)
    expect(res.filledCount).toBe(1)
    expect(res.habitCount).toBe(2)
  })

  it('renvoie 0 sans habitude active plutot que NaN', () => {
    const res = scoreCategory(cat(1), [habit(1, 1, { archived: 1 })], {})
    expect(res.score).toBe(0)
    expect(res.habitCount).toBe(0)
  })

  it('ignore les poids nuls ou negatifs', () => {
    const habits = [habit(1, 1, { weight: 0 }), habit(2, 1, { weight: -5 })]
    const res = scoreCategory(cat(1), habits, { 1: 1, 2: 1 })
    expect(res.score).toBe(0)
  })

  it('distingue une habitude non renseignee d une habitude non faite', () => {
    const res = scoreCategory(cat(1), [habit(1, 1), habit(2, 1)], { 1: 0 })
    expect(res.habits[0]).toMatchObject({ filled: true, ratio: 0 })
    expect(res.habits[1]).toMatchObject({ filled: false, ratio: 0 })
  })
})

describe('scoreDay', () => {
  const categories = [cat(1, { weight: 2 }), cat(2, { weight: 1 })]
  const habits = [habit(1, 1), habit(2, 2)]

  it('fait la moyenne ponderee des volets', () => {
    // Volet 1 (poids 2) a 100, volet 2 (poids 1) a 0 => 66,67
    const day = scoreDay('2026-11-23', categories, habits, { 1: 1 })
    expect(day.total).toBeCloseTo(66.67, 1)
    expect(day.habitCount).toBe(2)
    expect(day.filledCount).toBe(1)
  })

  it('exclut du total les volets sans habitude active', () => {
    const withEmpty = [...categories, cat(3, { weight: 5 })]
    const day = scoreDay('2026-11-23', withEmpty, habits, { 1: 1, 2: 1 })
    expect(day.total).toBe(100)
  })

  it('ignore les volets archives', () => {
    const day = scoreDay('2026-11-23', [cat(1), cat(2, { archived: 1 })], habits, { 1: 1 })
    expect(day.total).toBe(100)
  })

  it('renvoie 0 pour une journee entierement vide', () => {
    const day = scoreDay('2026-11-23', categories, habits, {})
    expect(day.total).toBe(0)
  })
})

describe('series', () => {
  const scores = new Map([
    ['2026-11-19', 95],
    ['2026-11-20', 40], // rupture
    ['2026-11-21', 80],
    ['2026-11-22', 90],
    ['2026-11-23', 71],
  ])

  it('compte la serie en cours en remontant depuis une date', () => {
    expect(currentStreak(scores, '2026-11-23')).toBe(3)
  })

  it('s arrete sur un jour manquant', () => {
    expect(currentStreak(scores, '2026-11-24')).toBe(0)
  })

  it('trouve la meilleure serie de l historique', () => {
    expect(bestStreak(scores)).toBe(3)
  })
})

describe('dates', () => {
  it('decale une date ISO sans deriver aux changements de mois', () => {
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('renvoie la date locale et non UTC', () => {
    // 23 h locales : la date UTC peut deja etre au lendemain.
    const d = new Date(2026, 10, 23, 23, 30)
    expect(todayIso(d)).toBe('2026-11-23')
  })
})

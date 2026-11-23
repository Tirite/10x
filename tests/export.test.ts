import { describe, expect, it } from 'vitest'
import { buildDetailCsv, buildSummaryCsv, buildXml, parseBackup } from '../src/domain/export'
import type { Category, DayValues, Habit } from '../src/domain/types'

const categories: Category[] = [
  { id: 1, name: 'Sportif', icon: 'S', color: '#10b981', weight: 2, order: 0, archived: 0 },
  // Nom volontairement piege : point-virgule et guillemets.
  { id: 2, name: 'Pro; "special"', icon: 'P', color: '#3b82f6', weight: 1, order: 1, archived: 0 },
]

const habits: Habit[] = [
  {
    id: 1,
    categoryId: 1,
    name: 'Pas',
    kind: 'quantity',
    target: 8000,
    unit: 'pas',
    weight: 1,
    order: 0,
    archived: 0,
  },
  {
    id: 2,
    categoryId: 2,
    name: 'Tache cle',
    kind: 'binary',
    target: 0,
    weight: 1,
    order: 0,
    archived: 0,
  },
]

const valuesByDate = new Map<string, DayValues>([
  ['2026-11-22', { 1: 4000, 2: 1 }],
  ['2026-11-23', { 1: 9000 }],
])

describe('export CSV detaille', () => {
  it('ecrit un BOM, un en-tete et une ligne par habitude et par jour', () => {
    const csv = buildDetailCsv({ categories, habits, valuesByDate })
    expect(csv.startsWith('﻿')).toBe(true)
    const lines = csv.trimEnd().split('\r\n')
    expect(lines).toHaveLength(1 + 4)
    expect(lines[0]).toContain('date;volet')
  })

  it('echappe les points-virgules et les guillemets', () => {
    const csv = buildDetailCsv({ categories, habits, valuesByDate })
    expect(csv).toContain('"Pro; ""special"""')
  })

  it('plafonne le taux a 100 % quand l objectif est depasse', () => {
    const csv = buildDetailCsv({ categories, habits, valuesByDate })
    const ligne = csv.trimEnd().split('\r\n').find((l) => l.startsWith('2026-11-23;Sportif'))
    expect(ligne).toBeDefined()
    expect(ligne).toContain('100,0')
  })
})

describe('export CSV recapitulatif', () => {
  it('utilise la virgule decimale pour Excel francophone', () => {
    const csv = buildSummaryCsv({ categories, habits, valuesByDate })
    const line = csv.trimEnd().split('\r\n')[1]
    // 22/11 : sportif 50 %, pro 100 % => total pondere 66,7
    expect(line).toContain('66,7')
  })

  it('aligne les colonnes sur les volets actifs', () => {
    const csv = buildSummaryCsv({ categories, habits, valuesByDate })
    const header = csv.trimEnd().split('\r\n')[0]
    // date + 2 volets + score_jour + renseignees + total + note.
    // Un split naif ne convient pas ici : le nom du 2e volet contient un point-virgule
    // et se trouve donc entre guillemets.
    expect(header).toBe(
      '﻿date;Sportif;"Pro; ""special""";score_jour;habitudes_renseignees;habitudes_total;note',
    )
  })

  it('reporte la note de la journee', () => {
    const csv = buildSummaryCsv({
      categories,
      habits,
      valuesByDate,
      days: [{ date: '2026-11-23', note: 'journee calme', createdAt: 0, updatedAt: 0 }],
    })
    expect(csv).toContain('journee calme')
  })
})

describe('export XML', () => {
  it('produit un document bien forme et echappe les attributs', () => {
    const xml = buildXml({ categories, habits, valuesByDate })
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<jour date="2026-11-23"')
    expect(xml).toContain('&quot;special&quot;')
    expect(xml.trimEnd().endsWith('</journal>')).toBe(true)
  })
})

describe('parseBackup', () => {
  it('refuse un fichier non JSON', () => {
    expect(() => parseBackup('pas du json')).toThrow(/JSON/)
  })

  it('refuse un JSON etranger a l application', () => {
    expect(() => parseBackup('{"app":"autre"}')).toThrow(/10x/)
  })

  it('refuse une sauvegarde incomplete', () => {
    expect(() => parseBackup('{"app":"app10x","categories":[]}')).toThrow(/habits/)
  })

  it('accepte une sauvegarde valide', () => {
    const ok = parseBackup(
      JSON.stringify({
        app: 'app10x',
        schemaVersion: 1,
        categories: [],
        habits: [],
        scores: [],
        days: [],
      }),
    )
    expect(ok.app).toBe('app10x')
  })
})

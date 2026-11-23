import { useEffect, useRef, useState } from 'react'
import { useAllDays, useAllValues, useCategories, useHabits } from '../db/hooks'
import { exportBackup, importBackup, requestPersistence, storageEstimate } from '../db/backup'
import { resetAll } from '../db/schema'
import {
  buildDetailCsv,
  buildSummaryCsv,
  buildXml,
  saveFile,
  stamp,
  type ExportInput,
} from '../domain/export'

type Status = { tone: 'ok' | 'err'; text: string } | undefined

/** Export des données, restauration d'une sauvegarde, réinitialisation. */
export default function Data() {
  const categories = useCategories()
  const habits = useHabits()
  const valuesByDate = useAllValues()
  const days = useAllDays()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>()
  const [storage, setStorage] = useState<{ usage: number; quota: number }>()
  const [persisted, setPersisted] = useState<boolean>()

  useEffect(() => {
    void storageEstimate().then(setStorage)
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [valuesByDate])

  const input: ExportInput = { categories, habits, valuesByDate, days }
  const dayCount = valuesByDate.size

  async function run(label: string, fn: () => Promise<void>) {
    try {
      await fn()
      setStatus({ tone: 'ok', text: `${label} : fichier prêt.` })
    } catch (err) {
      setStatus({ tone: 'err', text: (err as Error).message })
    }
  }

  async function onPickFile(file: File) {
    try {
      const report = await importBackup(await file.text())
      setStatus({
        tone: 'ok',
        text: `Restauré : ${report.categories} volets, ${report.habits} habitudes, ${report.scores} valeurs.`,
      })
    } catch (err) {
      setStatus({ tone: 'err', text: (err as Error).message })
    }
  }

  return (
    <div className="space-y-3 px-4 pb-4">
      <Panel title="Export" subtitle={`${dayCount} journée${dayCount > 1 ? 's' : ''} enregistrée${dayCount > 1 ? 's' : ''}`}>
        <Row
          label="CSV détaillé"
          hint="Une ligne par habitude et par jour — pour un tableau croisé."
          action="Exporter"
          onClick={() =>
            run('CSV détaillé', () =>
              saveFile(`10x-detail-${stamp()}.csv`, 'text/csv', buildDetailCsv(input)),
            )
          }
        />
        <Row
          label="CSV récapitulatif"
          hint="Une ligne par jour, une colonne par volet."
          action="Exporter"
          onClick={() =>
            run('CSV récapitulatif', () =>
              saveFile(`10x-recap-${stamp()}.csv`, 'text/csv', buildSummaryCsv(input)),
            )
          }
        />
        <Row
          label="XML"
          hint="Pour une relecture par un autre outil."
          action="Exporter"
          onClick={() =>
            run('XML', () =>
              saveFile(`10x-${stamp()}.xml`, 'application/xml', buildXml(input)),
            )
          }
        />
        <Row
          label="Sauvegarde JSON"
          hint="Copie complète et réimportable. À faire régulièrement."
          action="Sauvegarder"
          primary
          onClick={() =>
            run('Sauvegarde', async () =>
              saveFile(`10x-sauvegarde-${stamp()}.json`, 'application/json', await exportBackup()),
            )
          }
        />
        <p className="px-4 pb-3 pt-1 text-[11px] text-muted">
          Sur iPhone, le fichier part dans la feuille de partage : AirDrop vers le PC,
          enregistrement dans Fichiers ou envoi par mail.
        </p>
      </Panel>

      <Panel title="Restauration">
        <Row
          label="Importer une sauvegarde JSON"
          hint="Remplace entièrement les données actuelles."
          action="Choisir un fichier"
          onClick={() => fileInput.current?.click()}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void onPickFile(file)
          }}
        />
      </Panel>

      <Panel title="Stockage">
        <div className="space-y-1.5 px-4 py-3 text-[13px]">
          <Line
            label="Espace utilisé"
            value={storage ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}` : '—'}
          />
          <Line label="Stockage persistant" value={persisted ? 'accordé' : 'non accordé'} />
          {!persisted && (
            <button
              type="button"
              onClick={() => void requestPersistence().then(setPersisted)}
              className="mt-1 text-[13px] text-accent"
            >
              Demander le stockage persistant
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Zone sensible">
        <Row
          label="Réinitialiser l’application"
          hint="Supprime toutes les saisies et rétablit les volets par défaut."
          action="Réinitialiser"
          danger
          onClick={() => {
            if (
              !confirm(
                'Supprimer toutes les données et rétablir les volets par défaut ? Cette action est définitive.',
              )
            )
              return
            void resetAll().then(() =>
              setStatus({ tone: 'ok', text: 'Application réinitialisée.' }),
            )
          }}
        />
      </Panel>

      {status && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-[13px] ${
            status.tone === 'ok' ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="px-4 pb-1 pt-3">
        <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function Row({
  label,
  hint,
  action,
  onClick,
  primary,
  danger,
}: {
  label: string
  hint?: string
  action: string
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px]">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`h-9 shrink-0 rounded-xl px-3 text-[13px] font-medium ${
          danger
            ? 'bg-bad/15 text-bad active:bg-bad/25'
            : primary
              ? 'bg-accent text-white active:opacity-80'
              : 'bg-surface-2 text-ink active:bg-border'
        }`}
      >
        {action}
      </button>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function formatBytes(n: number): string {
  if (!n) return '0 o'
  const units = ['o', 'ko', 'Mo', 'Go']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

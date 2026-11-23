import { useState } from 'react'
import { useCategories, useHabits } from '../db/hooks'
import {
  addCategory,
  addHabit,
  archiveCategory,
  archiveHabit,
  deleteCategoryForever,
  deleteHabitForever,
  moveItem,
  restoreCategory,
  restoreHabit,
  updateCategory,
  updateHabit,
} from '../db/queries'
import type { Category, Habit, HabitKind } from '../domain/types'

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
]

const KIND_LABEL: Record<HabitKind, string> = {
  binary: 'Fait / pas fait',
  scale: 'Note 0 à 5',
  quantity: 'Quantité vs objectif',
}

/** Configuration des volets et des habitudes. */
export default function Settings() {
  const categories = useCategories()
  const habits = useHabits()
  const [showArchived, setShowArchived] = useState(false)

  const visible = categories.filter((c) => (showArchived ? true : !c.archived))

  return (
    <div className="space-y-3 px-4 pb-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Afficher les éléments archivés
        </label>
        <button
          type="button"
          onClick={() => void addCategory()}
          className="h-9 rounded-xl bg-accent px-3 text-[13px] font-medium text-white active:opacity-80"
        >
          + Volet
        </button>
      </div>

      {visible.map((category) => (
        <CategoryEditor
          key={category.id}
          category={category}
          habits={habits.filter((h) => h.categoryId === category.id)}
          showArchived={showArchived}
        />
      ))}

      <p className="px-1 text-[11px] text-muted">
        Archiver conserve l’historique déjà saisi ; supprimer efface aussi les valeurs
        correspondantes. Le poids multiplie l’importance d’un volet ou d’une habitude dans le
        score.
      </p>
    </div>
  )
}

function CategoryEditor({
  category,
  habits,
  showArchived,
}: {
  category: Category
  habits: Habit[]
  showArchived: boolean
}) {
  const id = category.id as number
  const list = habits.filter((h) => (showArchived ? true : !h.archived))

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-surface ${
        category.archived ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <input
          value={category.icon}
          onChange={(e) => void updateCategory(id, { icon: e.target.value.slice(0, 2) })}
          aria-label="Icône du volet"
          className="h-11 w-12 rounded-xl bg-surface-2 text-center text-xl outline-none"
        />
        <input
          value={category.name}
          onChange={(e) => void updateCategory(id, { name: e.target.value })}
          aria-label="Nom du volet"
          className="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/60"
        />
        <WeightInput
          value={category.weight}
          onChange={(weight) => void updateCategory(id, { weight })}
        />
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-3">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Couleur ${c}`}
            onClick={() => void updateCategory(id, { color: c })}
            className={`h-7 w-7 rounded-full ${
              category.color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="↑" onClick={() => void moveItem('categories', id, -1)} />
          <IconBtn label="↓" onClick={() => void moveItem('categories', id, 1)} />
        </div>
      </div>

      {list.map((habit) => (
        <HabitEditor key={habit.id} habit={habit} />
      ))}

      <div className="flex items-center gap-2 border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={() => void addHabit(id)}
          className="h-9 rounded-xl bg-surface-2 px-3 text-[13px] active:bg-border"
        >
          + Habitude
        </button>
        <div className="ml-auto flex gap-2">
          {category.archived ? (
            <>
              <button
                type="button"
                onClick={() => void restoreCategory(id)}
                className="h-9 rounded-xl bg-surface-2 px-3 text-[13px] active:bg-border"
              >
                Restaurer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Supprimer définitivement « ${category.name} », ses habitudes et toutes leurs valeurs ?`,
                    )
                  )
                    void deleteCategoryForever(id)
                }}
                className="h-9 rounded-xl bg-bad/15 px-3 text-[13px] text-bad active:bg-bad/25"
              >
                Supprimer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void archiveCategory(id)}
              className="h-9 rounded-xl bg-surface-2 px-3 text-[13px] text-muted active:bg-border"
            >
              Archiver
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function HabitEditor({ habit }: { habit: Habit }) {
  const id = habit.id as number

  return (
    <div className={`border-t border-border px-3 py-3 ${habit.archived ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <input
          value={habit.name}
          onChange={(e) => void updateHabit(id, { name: e.target.value })}
          aria-label="Nom de l’habitude"
          className="h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/60"
        />
        <WeightInput value={habit.weight} onChange={(weight) => void updateHabit(id, { weight })} />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={habit.kind}
          onChange={(e) => void updateHabit(id, { kind: e.target.value as HabitKind })}
          aria-label="Type de notation"
          className="h-10 flex-1 rounded-xl bg-surface-2 px-2 text-[13px] text-ink outline-none"
        >
          {(Object.keys(KIND_LABEL) as HabitKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <IconBtn label="↑" onClick={() => void moveItem('habits', id, -1)} />
        <IconBtn label="↓" onClick={() => void moveItem('habits', id, 1)} />
      </div>

      {habit.kind === 'quantity' && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={habit.target || ''}
            placeholder="objectif"
            onChange={(e) => void updateHabit(id, { target: Number(e.target.value) || 0 })}
            aria-label="Objectif"
            className="h-10 w-28 rounded-xl bg-surface-2 px-3 text-center text-[15px] tabular-nums outline-none"
          />
          <input
            value={habit.unit ?? ''}
            placeholder="unité (min, pas…)"
            onChange={(e) => void updateHabit(id, { unit: e.target.value })}
            aria-label="Unité"
            className="h-10 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[15px] outline-none"
          />
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        {habit.archived ? (
          <>
            <button
              type="button"
              onClick={() => void restoreHabit(id)}
              className="text-[12px] text-accent"
            >
              Restaurer
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Supprimer définitivement « ${habit.name} » et ses valeurs ?`))
                  void deleteHabitForever(id)
              }}
              className="text-[12px] text-bad"
            >
              Supprimer
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void archiveHabit(id)}
            className="text-[12px] text-muted"
          >
            Archiver
          </button>
        )}
      </div>
    </div>
  )
}

function WeightInput({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-surface-2 px-2">
      <span className="text-[11px] text-muted">×</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        aria-label="Poids"
        className="w-10 bg-transparent text-center text-[15px] tabular-nums outline-none"
      />
    </label>
  )
}

function IconBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === '↑' ? 'Monter' : 'Descendre'}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink active:bg-border"
    >
      {label}
    </button>
  )
}

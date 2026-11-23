import { Suspense, lazy, useEffect, useState } from 'react'
import Today from './pages/Today'
import Settings from './pages/Settings'
import Data from './pages/Data'

// Recharts pèse l'essentiel du bundle : l'historique est chargé à la demande.
// Le service worker précache ce fragment, il reste donc disponible hors-ligne.
const History = lazy(() => import('./pages/History'))
import { ensureSeed } from './db/schema'
import { todayIso } from './domain/scoring'

type Tab = 'today' | 'history' | 'settings' | 'data'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Jour', icon: '◎' },
  { id: 'history', label: 'Historique', icon: '◫' },
  { id: 'settings', label: 'Réglages', icon: '⚙' },
  { id: 'data', label: 'Données', icon: '↧' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayIso())
  const [ready, setReady] = useState(false)

  // Création des volets par défaut au premier lancement.
  useEffect(() => {
    void ensureSeed().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-[13px] text-muted">Chargement…</div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="safe-top sticky top-0 z-10 bg-bg/90 px-4 pb-2 backdrop-blur">
        <h1 className="text-[22px] font-semibold tracking-tight">
          10x <span className="text-[13px] font-normal text-muted">{titleFor(tab)}</span>
        </h1>
      </header>

      <main className="flex-1 pt-1">
        {tab === 'today' && <Today date={date} onDateChange={setDate} />}
        {tab === 'history' && (
          <Suspense
            fallback={<p className="px-4 py-8 text-center text-[13px] text-muted">Chargement…</p>}
          >
            <History
              onOpenDay={(d) => {
                setDate(d)
                setTab('today')
              }}
            />
          </Suspense>
        )}
        {tab === 'settings' && <Settings />}
        {tab === 'data' && <Data />}
      </main>

      {/* Barre d'onglets : au-dessus de la barre home de l'iPhone. */}
      <nav className="safe-bottom sticky bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
                tab === t.id ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="text-[18px] leading-none" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function titleFor(tab: Tab): string {
  switch (tab) {
    case 'today':
      return 'journal du jour'
    case 'history':
      return 'historique'
    case 'settings':
      return 'volets et habitudes'
    case 'data':
      return 'export et sauvegarde'
  }
}

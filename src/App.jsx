import { useEffect } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { StoreProvider, useStore } from './store/StoreContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import SheetView from './components/SheetView'
import RecordDrawer from './components/RecordDrawer'
import FormBuilder from './components/FormBuilder'
import FormsList from './components/FormsList'
import UsersTeams from './components/UsersTeams'
import WorkflowsPage from './components/WorkflowsPage'
import { cx } from './lib/utils'
import { isAdmin } from './lib/permissions'

const ADMIN_PAGES = ['builder', 'users', 'workflows']

function Toasts() {
  const { toasts } = useStore()
  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.tone] || Info
        return (
          <div key={t.id} className="anim-rise flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-xl">
            <Icon size={16} className={cx(t.tone === 'success' && 'text-emerald-400', t.tone === 'error' && 'text-red-400', t.tone === 'info' && 'text-indigo-300')} />
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

function Shell() {
  const { state, ui, patchUi, currentUser } = useStore()
  const form = state.forms.find((f) => f.id === ui.activeFormId)
  // The builder remounts per target form so its draft starts fresh.
  const builderKey = ui.builderFormId || 'new'

  // Admin-only pages are not reachable for other roles; they fall back to the forms list.
  const blocked = ADMIN_PAGES.includes(ui.page) && !isAdmin(currentUser)
  const page = blocked ? 'forms' : ui.page
  useEffect(() => {
    if (blocked) patchUi({ page: 'forms' }, { replace: true })
  }, [blocked, patchUi])

  let content
  switch (page) {
    case 'forms':
      content = <FormsList />
      break
    case 'builder':
      content = <FormBuilder key={builderKey} />
      break
    case 'users':
      content = <UsersTeams />
      break
    case 'workflows':
      content = <WorkflowsPage />
      break
    default:
      content = form ? <SheetView key={form.id} form={form} /> : <FormsList />
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-app">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {content}
      </main>
      {ui.drawer && form && page === 'sheet' && <RecordDrawer form={form} recordId={ui.drawer} onClose={() => patchUi({ drawer: null })} />}
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

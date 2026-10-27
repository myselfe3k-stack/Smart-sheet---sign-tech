import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { Avatar, Popover } from './ui'
import { HeaderSearch, NotificationBell } from './NotificationPanel'
import { cx } from '../lib/utils'

const APP_NAME = 'Difinity Flow Sheet'

const roleLabel = (user, teams) => {
  if (user.role === 'admin') return 'Admin'
  const team = teams.find((t) => t.id === user.teamId)
  return user.role === 'manager' ? 'Manager' : `${team?.name || 'No team'} user`
}

export default function TopBar() {
  const { state, ui, patchUi, goBack, currentUser, actions } = useStore()
  const canGoBack = ui.history.length > 0 || ui.page !== 'forms'
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // Header uses the same blue as the top of the sidebar gradient (#1E88E5) so the two read as one frame.
  return (
    <header className="flex flex-wrap items-center gap-3 bg-brand-600 px-5 py-3 text-white">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {canGoBack && (
          <button
            onClick={goBack}
            title="Back"
            aria-label="Go back"
            className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h1 className="truncate text-base font-semibold tracking-tight text-white">{APP_NAME}</h1>
      </div>

      <div className="hidden flex-1 justify-center md:flex">
        <HeaderSearch />
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="relative">
          <button
            data-popover-trigger
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-white/25 py-1 pl-1 pr-2 text-left transition hover:bg-white/10"
          >
            <Avatar user={currentUser} size={26} />
            <span className="hidden leading-tight md:block">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-white/60">Current user</span>
              <span className="block text-xs font-semibold text-white">{roleLabel(currentUser, state.teams)}</span>
            </span>
            <ChevronDown size={14} className="text-white/70" />
          </button>
          <Popover open={switcherOpen} onClose={() => setSwitcherOpen(false)} align="right" className="w-64">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Simulate role</p>
            {state.users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  actions.setCurrentUser(u.id)
                  setSwitcherOpen(false)
                  actions.toast(`Now viewing as ${u.name}`)
                }}
                className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50', u.id === currentUser.id && 'bg-indigo-50')}
              >
                <Avatar user={u} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-800">{u.name}</span>
                  <span className="block text-xs text-gray-400">{roleLabel(u, state.teams)}</span>
                </span>
              </button>
            ))}
          </Popover>
        </div>

      </div>
    </header>
  )
}

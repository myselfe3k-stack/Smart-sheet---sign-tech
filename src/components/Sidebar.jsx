import { useState } from 'react'
import { Folder, LayoutGrid, Plus, Users, Workflow } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import logo from '../assets/logo.png'
import { isAdmin } from '../lib/permissions'
import { Avatar, Popover } from './ui'
import { cx } from '../lib/utils'

function NavButton({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      type="button"
      data-popover-trigger
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'group relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15',
        active && 'bg-white/20 text-white shadow-inner',
      )}
    >
      <Icon size={19} strokeWidth={2} fill="currentColor" />
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-brand-700">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  )
}

export default function Sidebar() {
  const { state, ui, patchUi, currentUser, actions } = useStore()
  const [appsOpen, setAppsOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const go = (page) => patchUi({ page })

  const admin = isAdmin(currentUser)
  const newForm = () => patchUi({ page: 'builder', builderFormId: null })

  return (
    <aside className="bg-sidebar relative z-30 flex w-16 shrink-0 flex-col items-center py-4 shadow-lg">
      <img src={logo} alt="Difinity Flow Sheet" className="mb-5 h-9 w-9 object-contain brightness-0 invert" />
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        <NavButton icon={Folder} label="Forms" active={ui.page === 'forms' || ui.page === 'sheet'} onClick={() => go('forms')} />
        {admin && (
          <>
            <NavButton icon={Users} label="Teams & Users" active={ui.page === 'users'} onClick={() => go('users')} />
            <NavButton icon={Workflow} label="Workflows" active={ui.page === 'workflows'} onClick={() => go('workflows')} />
          </>
        )}
        {admin && (
          <button
            type="button"
            onClick={newForm}
            title="Create new form"
            aria-label="Create new form"
            className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-800 shadow-md transition hover:scale-105"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}
      </nav>

      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <NavButton icon={LayoutGrid} label="Apps" active={appsOpen} onClick={() => setAppsOpen((o) => !o)} />
          <Popover open={appsOpen} onClose={() => setAppsOpen(false)} className="!top-auto bottom-0 !left-12 !mt-0 w-56">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Apps</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Sheets', Folder, () => go('forms')],
                ...(admin
                  ? [
                      ['Workflows', Workflow, () => go('workflows')],
                      ['Directory', Users, () => go('users')],
                    ]
                  : []),
              ].map(([label, Icon, fn]) => (
                <button
                  key={label}
                  onClick={() => {
                    fn()
                    setAppsOpen(false)
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 p-3 text-xs font-medium text-gray-600 hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <Icon size={18} className="text-indigo-500" />
                  {label}
                </button>
              ))}
            </div>
          </Popover>
        </div>
        <div className="relative mt-2">
          <button data-popover-trigger onClick={() => setUserOpen((o) => !o)} className="flex rounded-full ring-2 ring-white/60 transition hover:ring-white" aria-label="Switch user">
            <Avatar user={currentUser} size={36} />
          </button>
          <Popover open={userOpen} onClose={() => setUserOpen(false)} className="!top-auto bottom-0 !left-12 !mt-0 w-60">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Signed in as</p>
            {state.users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  actions.setCurrentUser(u.id)
                  setUserOpen(false)
                }}
                className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50', u.id === currentUser.id && 'bg-indigo-50')}
              >
                <Avatar user={u} size={24} />
                <span className="flex-1 truncate">{u.name}</span>
                <span className="text-xs text-gray-400">{state.teams.find((t) => t.id === u.teamId)?.name || u.role}</span>
              </button>
            ))}
          </Popover>
        </div>
      </div>

    </aside>
  )
}

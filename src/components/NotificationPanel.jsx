import { useMemo, useState } from 'react'
import { Bell, CheckCheck, FileText, Search } from 'lucide-react'
import { useStore, visibleNotifications } from '../store/StoreContext'
import { recordTitle, stageLabel } from '../lib/records'
import { cx, timeAgo } from '../lib/utils'
import { EmptyState, Popover } from './ui'

// Header bell: unread badge + dropdown list with "mark as read".
export function NotificationBell() {
  const { state, currentUser, actions, patchUi } = useStore()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('unread')
  const all = visibleNotifications(state, currentUser)
  const unread = all.filter((n) => !n.read)
  const list = tab === 'unread' ? unread : all

  return (
    <div className="relative">
      <button
        data-popover-trigger
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        title="Notifications"
        className={cx('relative flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/15', open && 'bg-white/20')}
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-brand-600">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="right" className="w-[360px] max-w-[calc(100vw-2rem)] !p-0">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <h2 className="flex-1 text-sm font-semibold text-gray-900">Notifications</h2>
          <button
            onClick={() => actions.markRead(unread.map((n) => n.id))}
            disabled={!unread.length}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
        <div className="flex gap-1 px-4 pt-3">
          {['unread', 'all'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx('rounded-full px-3 py-1 text-xs font-medium capitalize', tab === t ? 'bg-brand-100 text-brand-800' : 'text-gray-500 hover:bg-gray-50')}
            >
              {t} {t === 'unread' && `(${unread.length})`}
            </button>
          ))}
        </div>
        <div className="scroll-thin max-h-[60vh] overflow-y-auto">
          {list.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" body="New stage assignments for your team will show up here." />
          ) : (
            <ul className="p-2">
              {list.map((n) => {
                const team = state.teams.find((t) => t.id === n.teamId)
                return (
                  <li key={n.id} className={cx('group flex gap-3 rounded-xl p-3 transition hover:bg-gray-50', !n.read && 'bg-brand-50')}>
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} />
                    <button
                      className="flex-1 text-left"
                      onClick={() => {
                        actions.markRead([n.id])
                        patchUi({ page: 'sheet', activeFormId: n.formId, drawer: n.recordId })
                        setOpen(false)
                      }}
                    >
                      <p className="text-sm text-gray-800">{n.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {team?.name} · {timeAgo(n.at)}
                      </p>
                    </button>
                    {!n.read && (
                      <button onClick={() => actions.markRead([n.id])} className="self-start rounded-md px-1.5 py-0.5 text-[11px] text-gray-400 opacity-0 hover:bg-white hover:text-brand-800 group-hover:opacity-100">
                        Mark read
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Popover>
    </div>
  )
}

// Header search across all records in all forms.
export function HeaderSearch() {
  const { state, patchUi } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return state.records
      .filter((r) => Object.values(r.values).some((v) => String(v ?? '').toLowerCase().includes(term)))
      .slice(0, 20)
  }, [q, state.records])

  return (
    <div className="relative w-full max-w-xs">
      <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
      <input
        data-popover-trigger
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search all records…"
        aria-label="Search all records"
        className="h-9 w-full rounded-lg border border-white/20 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-white/40"
      />
      <Popover open={open && !!q.trim()} onClose={() => setOpen(false)} className="w-full min-w-[300px] !p-1.5">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-400">Nothing matches “{q}”.</p>
        ) : (
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            {results.map((rec) => {
              const form = state.forms.find((f) => f.id === rec.formId)
              if (!form) return null
              return (
                <button
                  key={rec.id}
                  onClick={() => {
                    patchUi({ page: 'sheet', activeFormId: rec.formId, drawer: rec.id })
                    setOpen(false)
                    setQ('')
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-brand-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
                    <FileText size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800">{recordTitle(form, rec)}</span>
                    <span className="block truncate text-xs text-gray-400">
                      {form.name} · {stageLabel(form, rec)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Popover>
    </div>
  )
}

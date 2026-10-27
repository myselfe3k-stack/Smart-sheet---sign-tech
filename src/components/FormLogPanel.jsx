import { useMemo, useState } from 'react'
import { History, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { recordTitle } from '../lib/records'
import { cx, formatDate, formatDateTime, timeAgo } from '../lib/utils'
import { Avatar, EmptyState } from './ui'

const FILTERS = [
  ['all', 'All'],
  ['records', 'Records'],
  ['form', 'Form changes'],
]

const dayLabel = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return formatDate(iso)
}

// Activity log for one form: every record's history plus edits to the form itself.
export default function FormLogPanel({ form, records, onOpenRecord, onClose }) {
  const { state } = useStore()
  const [filter, setFilter] = useState('all')

  const entries = useMemo(() => {
    const fromRecords = records.flatMap((r) => r.history.map((h) => ({ ...h, record: r })))
    const fromForm = (form.audit || []).map((h) => ({ ...h, record: null }))
    const all = filter === 'records' ? fromRecords : filter === 'form' ? fromForm : [...fromRecords, ...fromForm]
    return all.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [records, form.audit, filter])

  const days = []
  for (const e of entries) {
    const label = dayLabel(e.at)
    if (days[days.length - 1]?.label !== label) days.push({ label, items: [] })
    days[days.length - 1].items.push(e)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/20" onMouseDown={onClose}>
      <aside className="anim-drawer flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <History size={16} />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Activity log</h2>
            <p className="text-xs text-gray-500">{form.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Close log">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-5 py-2.5">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cx('rounded-full px-3 py-1 text-xs font-medium', filter === key ? 'bg-brand-100 text-brand-800' : 'text-gray-500 hover:bg-gray-50')}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400">{entries.length} entries</span>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" body="Changes to this form and its records will appear here." />
          ) : (
            days.map((day) => (
              <section key={day.label} className="mb-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{day.label}</h3>
                <ol className="space-y-3.5">
                  {day.items.map((h) => {
                    const u = state.users.find((x) => x.id === h.userId)
                    return (
                      <li key={`${h.record?.id || 'form'}-${h.id}`} className="flex gap-3">
                        <Avatar user={u || { name: 'Unknown' }} size={26} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800">
                            <b className="font-semibold">{u?.name || 'Unknown'}</b>{' '}
                            <span className="text-gray-600">{h.message.charAt(0).toLowerCase() + h.message.slice(1)}</span>
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            {h.record ? (
                              <button onClick={() => onOpenRecord(h.record.id)} className="font-medium text-brand-700 hover:underline">
                                {recordTitle(form, h.record)}
                              </button>
                            ) : (
                              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">Form</span>
                            )}
                            <span className="text-gray-400" title={formatDateTime(h.at)}>
                              {timeAgo(h.at)}
                            </span>
                          </div>
                          {h.type === 'field' && (
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-300">{h.from}</span>
                              <span className="text-gray-400">→</span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{h.to}</span>
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

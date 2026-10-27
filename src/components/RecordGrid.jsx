import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, FileText, Flag, Lock } from 'lucide-react'
import { displayValue, dueDateField, getValue, isHighPriority, isOverdue } from '../lib/records'
import { optionColor } from '../lib/colorRules'
import { canEditField } from '../lib/permissions'
import { useStore } from '../store/StoreContext'
import { cx, isEmpty } from '../lib/utils'
import { Avatar, FieldInput, Pill } from './ui'

const saveCell = (actions, record, col, value) => actions.updateRecord(record.id, { [col.id]: value }, { silent: true })

// Read-only rendering of a cell value.
function ReadCell({ ctx, form, record, col }) {
  const value = getValue(ctx, form, record, col.id)
  if (isEmpty(value)) return <span className="text-gray-300">—</span>
  switch (col.type) {
    case 'dropdown':
      return <Pill value={value} color={optionColor(col, value)} />
    case 'checkbox':
      return value ? <Check size={16} className="text-emerald-600" /> : <span className="text-gray-300">—</span>
    case 'user': {
      const u = ctx.users.find((x) => x.id === value)
      return (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Avatar user={u} size={20} /> {u?.name}
        </span>
      )
    }
    case 'email':
    case 'url':
      return <span className="truncate text-indigo-700">{value}</span>
    case 'date': {
      const overdue = col.id === dueDateField(form)?.id && isOverdue(form, record)
      return <span className={cx('whitespace-nowrap', overdue && 'font-semibold text-red-700')}>{displayValue(ctx, col, value)}</span>
    }
    default:
      return <span className="block max-w-[260px] truncate">{displayValue(ctx, col, value)}</span>
  }
}

// Dropdowns and user pickers are always live selects; empty ones are flagged as pending (amber).
function InlineSelect({ record, col, options }) {
  const { actions } = useStore()
  const value = record.values[col.id] ?? ''
  const color = col.type === 'dropdown' ? optionColor(col, value) : null
  return (
    <select
      value={value}
      onChange={(e) => saveCell(actions, record, col, e.target.value)}
      aria-label={value ? `Edit ${col.label}` : `Fill ${col.label}`}
      title={value ? `Change ${col.label}` : `Fill ${col.label}`}
      className={cx(
        'h-7 max-w-[200px] cursor-pointer rounded-full px-2.5 text-xs font-medium outline-none transition focus:ring-2 focus:ring-brand-200',
        value ? 'border border-black/10 text-gray-800 hover:border-brand-400' : 'border border-dashed border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100',
      )}
      style={value ? { background: color || '#FFFFFF' } : undefined}
    >
      <option value="">Select…</option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  )
}

// Click to type; Enter or clicking away saves, Esc cancels.
function TextEditCell({ ctx, form, record, col }) {
  const { actions } = useStore()
  const [draft, setDraft] = useState(null) // null = not editing
  const wrapRef = useRef(null)
  // Removing the input fires a blur; this flag makes each edit end exactly once (save or cancel).
  const doneRef = useRef(false)
  useEffect(() => {
    if (draft !== null) wrapRef.current?.querySelector('input')?.focus()
  }, [draft !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = record.values[col.id]
  const start = () => {
    doneRef.current = false
    setDraft(value ?? '')
  }
  const commit = () => {
    if (doneRef.current) return
    doneRef.current = true
    if (draft !== null && String(draft ?? '') !== String(value ?? '')) saveCell(actions, record, col, draft)
    setDraft(null)
  }
  const cancel = () => {
    doneRef.current = true
    setDraft(null)
  }
  if (draft === null)
    return (
      <button
        type="button"
        onClick={start}
        title={`Edit ${col.label}`}
        className="-mx-1.5 block w-[calc(100%+0.75rem)] cursor-text rounded-md px-1.5 py-1 text-left ring-brand-300 transition hover:bg-white/60 hover:ring-1"
      >
        <ReadCell ctx={ctx} form={form} record={record} col={col} />
      </button>
    )
  return (
    <div
      ref={wrapRef}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') cancel()
      }}
    >
      <FieldInput compact field={col} value={draft} users={ctx.users} onChange={setDraft} />
    </div>
  )
}

function Cell({ ctx, form, record, col, user }) {
  const { actions } = useStore()
  if (!canEditField(user, col)) return <ReadCell ctx={ctx} form={form} record={record} col={col} />
  if (col.type === 'dropdown') return <InlineSelect record={record} col={col} options={col.options.map((o) => [o, o])} />
  if (col.type === 'user') return <InlineSelect record={record} col={col} options={ctx.users.map((u) => [u.id, u.name])} />
  if (col.type === 'checkbox')
    return (
      <input
        type="checkbox"
        checked={!!record.values[col.id]}
        onChange={(e) => saveCell(actions, record, col, e.target.checked)}
        aria-label={col.label}
        className="h-4 w-4 cursor-pointer accent-indigo-600"
      />
    )
  return <TextEditCell ctx={ctx} form={form} record={record} col={col} />
}

export default function RecordGrid({ ctx, form, groups, columns, sort, onSort, onOpen, selected, setSelected, density, rowColor, startIndex, newRow }) {
  const { currentUser: user } = useStore()
  const rowH = density === 'compact' ? 'h-9' : 'h-12'
  const allIds = groups.flatMap((g) => g.rows.map((r) => r.id))
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id))
  let n = startIndex

  const toggle = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
          <th className="w-10 border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-indigo-600"
              checked={allChecked}
              onChange={() => setSelected(allChecked ? new Set() : new Set(allIds))}
              aria-label="Select all"
            />
          </th>
          <th className="w-14 border-b border-r border-gray-200 bg-gray-50 px-2 py-2.5 text-center">#</th>
          <th className="w-10 border-b border-r border-gray-200 bg-gray-50 px-2 py-2.5 text-center">
            <Flag size={13} className="mx-auto" />
          </th>
          {columns.map((c) => {
            const active = sort?.fieldId === c.id
            return (
              <th key={c.id} className="border-b border-r border-gray-200 bg-gray-50 px-3 py-0 last:border-r-0">
                <button onClick={() => onSort(c.id)} title={c.description || undefined} className="flex w-full items-center gap-1 py-2.5 text-left uppercase tracking-wide hover:text-gray-800">
                  <span className="whitespace-nowrap">{c.label}</span>
                  {c.required && <span className="text-red-400">*</span>}
                  {c.locked && <Lock size={11} className="text-gray-400" />}
                  {active && (sort.dir === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />)}
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {newRow}
        {groups.map((g) => (
          <GroupRows key={g.key}>
            {g.label !== null && (
              <tr>
                <td colSpan={columns.length + 3} className="border-b border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                  {g.label} <span className="ml-1 font-normal text-gray-400">{g.rows.length}</span>
                </td>
              </tr>
            )}
            {g.rows.map((r) => {
              n += 1
              const high = isHighPriority(form, r)
              const bg = rowColor(r)
              return (
                <tr key={r.id} style={{ background: bg || '#fff' }} className={cx('text-gray-800 transition-[filter] hover:brightness-[0.98]', rowH)}>
                  <td className="border-b border-r border-gray-200/80 px-3">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-indigo-600" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Select row" />
                  </td>
                  <td className="border-b border-r border-gray-200/80 px-2 text-center text-xs text-gray-400">
                    <button
                      type="button"
                      onClick={() => onOpen(r.id)}
                      title="Open details, workflow & history"
                      aria-label={`Open details for row ${n}`}
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-white hover:text-brand-700"
                    >
                      {n}
                      <FileText size={13} />
                    </button>
                  </td>
                  <td className="border-b border-r border-gray-200/80 px-2 text-center">
                    <Flag size={14} className={cx('mx-auto', high ? 'fill-red-500 text-red-500' : 'text-gray-300')} aria-label={high ? 'High priority' : 'Normal priority'} />
                  </td>
                  {columns.map((c) => (
                    <td key={c.id} className="border-b border-r border-gray-200/80 px-3 last:border-r-0">
                      <Cell ctx={ctx} form={form} record={r} col={c} user={user} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </GroupRows>
        ))}
      </tbody>
    </table>
  )
}

const GroupRows = ({ children }) => <>{children}</>

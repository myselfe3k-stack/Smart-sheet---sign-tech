import { useState } from 'react'
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Eye, History, Plus, EyeOff, Filter, GripVertical, Layers, Palette, Workflow,
} from 'lucide-react'
import { STATUS_OPTIONS } from '../data/models'
import { priorityField } from '../lib/records'
import { cx, move } from '../lib/utils'
import { Popover, SheetIcon } from './ui'
import logo from '../assets/logo.png'

function ToolButton({ icon: Icon, label, active, count, onClick }) {
  return (
    <button
      type="button"
      data-popover-trigger
      onClick={onClick}
      className={cx(
        'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] font-medium transition',
        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      <Icon size={15} />
      <span className="hidden md:inline">{label}</span>
      {count > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">{count}</span>}
    </button>
  )
}

const CheckList = ({ title, options, selected, onChange, render }) => (
  <div>
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const value = typeof o === 'string' ? o : o.id
        const on = selected.includes(value)
        return (
          <button
            key={value}
            onClick={() => onChange(on ? selected.filter((x) => x !== value) : [...selected, value])}
            className={cx(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition',
              on ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {render ? render(o) : value}
          </button>
        )
      })}
    </div>
  </div>
)

export default function Toolbar({ view, setView, form, teams, columns, columnConfig, setColumnConfig, onColorRules, onWorkflow, onLog, onExport, onNewRecord, aiOpen, onToggleAI, accessSlot, groupOptions }) {
  const [open, setOpen] = useState(null)
  const toggle = (k) => setOpen((o) => (o === k ? null : k))
  const close = () => setOpen(null)
  const f = view.filters
  const filterCount = f.statuses.length + f.teams.length + f.priorities.length
  const [dragIdx, setDragIdx] = useState(null)

  const ordered = columnConfig.order
  const hidden = columnConfig.hidden

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-white px-4 py-1.5">
      <div className="mr-2 flex min-w-0 items-center gap-2 border-r border-gray-200 pr-4" title={form.description || form.name}>
        <SheetIcon color="#1565C0" size={22} />
        <h2 className="max-w-[260px] truncate text-[15px] font-semibold text-gray-900">{form.name}</h2>
      </div>
      <div className="relative">
        <ToolButton icon={Filter} label="Filter" active={open === 'filter' || filterCount > 0} count={filterCount} onClick={() => toggle('filter')} />
        <Popover open={open === 'filter'} onClose={close} className="w-80 space-y-4">
          <CheckList title="Status" options={STATUS_OPTIONS} selected={f.statuses} onChange={(statuses) => setView({ filters: { ...f, statuses }, page: 0 })} />
          <CheckList title="Assigned team" options={teams} selected={f.teams} render={(t) => t.name} onChange={(t) => setView({ filters: { ...f, teams: t }, page: 0 })} />
          {priorityField(form) && (
            <CheckList title="Priority" options={priorityField(form).options} selected={f.priorities} onChange={(priorities) => setView({ filters: { ...f, priorities }, page: 0 })} />
          )}
          {filterCount > 0 && (
            <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => setView({ filters: { statuses: [], teams: [], priorities: [] } })}>
              Clear all filters
            </button>
          )}
        </Popover>
      </div>

      <div className="relative">
        <ToolButton icon={ArrowUpDown} label="Sort" active={open === 'sort' || !!view.sort} count={view.sort ? 1 : 0} onClick={() => toggle('sort')} />
        <Popover open={open === 'sort'} onClose={close} className="w-64">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sort by</p>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {columns.map((c) => {
              const on = view.sort?.fieldId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setView({ sort: on && view.sort.dir === 'desc' ? null : { fieldId: c.id, dir: on ? 'desc' : 'asc' } })}
                  className={cx('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50', on && 'bg-indigo-50 text-indigo-700')}
                >
                  {c.label}
                  {on && (view.sort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
              )
            })}
          </div>
        </Popover>
      </div>

      <div className="relative">
        <ToolButton icon={Columns3} label="Columns" active={open === 'columns'} count={hidden.length} onClick={() => toggle('columns')} />
        <Popover open={open === 'columns'} onClose={close} className="w-72">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Show, hide & reorder</p>
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {ordered.map((id, i) => {
              const col = columns.find((c) => c.id === id)
              if (!col) return null
              const isHidden = hidden.includes(id)
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== i) setColumnConfig({ order: move(ordered, dragIdx, i) })
                    setDragIdx(null)
                  }}
                  className={cx('flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-gray-50', dragIdx === i && 'opacity-40')}
                >
                  <GripVertical size={14} className="cursor-grab text-gray-300" />
                  <span className={cx('flex-1 truncate', isHidden && 'text-gray-400')}>{col.label}</span>
                  <button disabled={i === 0} onClick={() => setColumnConfig({ order: move(ordered, i, i - 1) })} className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up">
                    <ArrowUp size={13} />
                  </button>
                  <button disabled={i === ordered.length - 1} onClick={() => setColumnConfig({ order: move(ordered, i, i + 1) })} className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down">
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => setColumnConfig({ hidden: isHidden ? hidden.filter((h) => h !== id) : [...hidden, id] })}
                    className="rounded p-0.5 text-gray-500 hover:text-indigo-600"
                    aria-label={isHidden ? 'Show column' : 'Hide column'}
                  >
                    {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover>
      </div>

      <div className="relative">
        <ToolButton icon={Layers} label="Group" active={open === 'group' || !!view.groupBy} onClick={() => toggle('group')} />
        <Popover open={open === 'group'} onClose={close} className="w-56">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Group rows by</p>
          {[{ id: null, label: 'No grouping' }, ...groupOptions].map((g) => (
            <button
              key={g.id || 'none'}
              onClick={() => {
                setView({ groupBy: g.id })
                close()
              }}
              className={cx('block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50', view.groupBy === g.id && 'bg-indigo-50 text-indigo-700')}
            >
              {g.label}
            </button>
          ))}
        </Popover>
      </div>

      {onColorRules && <ToolButton icon={Palette} label="Color Rules" onClick={onColorRules} />}
      {onWorkflow && <ToolButton icon={Workflow} label="Workflow" onClick={onWorkflow} />}
      <ToolButton icon={History} label="Log" onClick={onLog} />

      <div className="ml-auto flex items-center gap-2">
        {accessSlot}
        <button
          type="button"
          onClick={onToggleAI}
          aria-pressed={aiOpen}
          title={aiOpen ? 'Hide AI assistant' : 'Show AI assistant'}
          className="bg-ai flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-white shadow-sm transition hover:opacity-95"
        >
          <img src={logo} alt="" className="h-3.5 w-3.5 object-contain brightness-0 invert" /> AI
        </button>
        {onNewRecord && (
          <button
            type="button"
            onClick={onNewRecord}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-700 px-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus size={14} />
            <span className="hidden md:inline">New Record</span>
          </button>
        )}
        <button
          type="button"
          onClick={onExport}
          title="Export the filtered rows to Excel"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Download size={14} />
          <span className="hidden md:inline">Export Excel</span>
        </button>
      </div>
    </div>
  )
}

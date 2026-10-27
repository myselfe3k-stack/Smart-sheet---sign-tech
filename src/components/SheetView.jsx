import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import {
  allColumns, assignedTeamId, compareValues, displayValue, getOverallStatus, getValue, priorityField, sortValue, stageLabel,
} from '../lib/records'
import { getRowColor } from '../lib/colorRules'
import { canCreateRecord, canEditField, isAdmin } from '../lib/permissions'
import Toolbar from './Toolbar'
import RecordGrid from './RecordGrid'
import ColorRulesPanel from './ColorRulesPanel'
import WorkflowEditor from './WorkflowEditor'
import AIAssistant from './AIAssistant'
import NewRecordRow from './NewRecordRow'
import FormAccess from './FormAccess'
import FormLogPanel from './FormLogPanel'
import { buildXlsx, downloadXlsx } from '../lib/exportXlsx'
import { todayStr } from '../lib/utils'
import { Button, EmptyState } from './ui'

const PAGE_SIZE = 10

const initialView = () => ({
  search: '',
  sort: null,
  filters: { statuses: [], teams: [], priorities: [] },
  groupBy: null,
  density: 'comfortable',
  page: 0,
})

export default function SheetView({ form }) {
  const { state, ui, patchUi, actions, currentUser } = useStore()
  const [views, setViews] = useState({})
  const view = views[form.id] || initialView()
  const setView = (patch) => setViews((v) => ({ ...v, [form.id]: { ...(v[form.id] || initialView()), ...patch } }))
  const [selected, setSelected] = useState(new Set())
  const [panel, setPanel] = useState(null) // 'colors' | 'workflow' | 'log'

  const ctx = { teams: state.teams, users: state.users }
  const admin = isAdmin(currentUser)
  const canCreate = canCreateRecord(currentUser, form)
  const columns = allColumns(form).map((c) => ({ ...c, locked: !c.virtual && !canEditField(currentUser, c) }))

  // Column order/visibility persisted per form in the store.
  const saved = state.viewConfigs[form.id] || {}
  const ids = columns.map((c) => c.id)
  const order = [...(saved.order || []).filter((id) => ids.includes(id)), ...ids.filter((id) => !(saved.order || []).includes(id))]
  const columnConfig = { order, hidden: saved.hidden || [] }
  const setColumnConfig = (patch) => actions.setViewConfig(form.id, { ...columnConfig, ...patch })
  const visibleColumns = order.filter((id) => !columnConfig.hidden.includes(id)).map((id) => columns.find((c) => c.id === id))

  const records = useMemo(() => state.records.filter((r) => r.formId === form.id), [state.records, form.id])
  const pf = priorityField(form)

  const filtered = useMemo(() => {
    const term = view.search.trim().toLowerCase()
    const { statuses, teams, priorities } = view.filters
    let list = records.filter((r) => {
      if (statuses.length && !statuses.includes(getOverallStatus(form, r))) return false
      if (teams.length && !teams.includes(assignedTeamId(form, r))) return false
      if (priorities.length && (!pf || !priorities.includes(r.values[pf.id]))) return false
      if (term) {
        const hay = [...Object.values(r.values), stageLabel(form, r)].map((v) => String(v ?? '').toLowerCase()).join(' ')
        if (!hay.includes(term)) return false
      }
      return true
    })
    if (view.sort) {
      const col = columns.find((c) => c.id === view.sort.fieldId)
      const dir = view.sort.dir === 'asc' ? 1 : -1
      list = [...list].sort(
        (a, b) =>
          dir *
          compareValues(sortValue(col, getValue(ctx, form, a, col.id)), sortValue(col, getValue(ctx, form, b, col.id))),
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, view.search, view.filters, view.sort, form, state.teams])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(view.page, pageCount - 1)
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const groupOptions = [
    { id: '__stage', label: 'Current Stage' },
    { id: '__team', label: 'Assigned Team' },
    { id: '__status', label: 'Status' },
    ...form.fields.filter((f) => ['dropdown', 'user', 'checkbox'].includes(f.type)).map((f) => ({ id: f.id, label: f.label })),
  ]

  const groups = useMemo(() => {
    if (!view.groupBy) return [{ key: 'all', label: null, rows: pageRows }]
    const map = new Map()
    for (const r of pageRows) {
      const raw = getValue(ctx, form, r, view.groupBy)
      const label = raw === '' || raw == null ? '(empty)' : String(raw)
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(r)
    }
    return [...map.entries()].map(([label, rows]) => ({ key: label, label, rows }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRows, view.groupBy])

  const onSort = (fieldId) => {
    const s = view.sort
    setView({ sort: s?.fieldId === fieldId ? (s.dir === 'asc' ? { fieldId, dir: 'desc' } : null) : { fieldId, dir: 'asc' } })
  }

  const openRecord = (id) => patchUi({ drawer: id })

  // Exports every filtered/sorted row (not just this page) with the visible columns and row colors.
  const exportExcel = () => {
    if (!filtered.length) return actions.toast('No records to export', 'error')
    const rows = filtered.map((r) => ({
      color: getRowColor(form, r),
      cells: visibleColumns.map((c) => {
        const v = getValue(ctx, form, r, c.id)
        return c.type === 'number' && typeof v === 'number' ? v : displayValue(ctx, c, v)
      }),
    }))
    downloadXlsx(`${form.name} - ${todayStr()}.xlsx`, buildXlsx(visibleColumns.map((c) => c.label), rows, form.name))
    actions.toast(`Exported ${rows.length} records`, 'success')
  }

  // Close the inline new-record row when leaving this sheet.
  useEffect(() => () => patchUi({ newRow: false }), [patchUi])

  const saveNew = (values) => {
    if (actions.createRecord(form.id, values)) {
      patchUi({ newRow: false })
      setView({ page: 0 })
    }
  }
  const newRow = ui.newRow && canCreate && (
    <NewRecordRow key="new" form={form} columns={visibleColumns} ctx={ctx} onSave={saveNew} onCancel={() => patchUi({ newRow: false })} />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        view={view}
        setView={setView}
        form={form}
        teams={state.teams}
        columns={columns}
        columnConfig={columnConfig}
        setColumnConfig={setColumnConfig}
        groupOptions={groupOptions}
        onColorRules={admin ? () => setPanel('colors') : null}
        onWorkflow={admin ? () => setPanel('workflow') : null}
        onLog={() => setPanel('log')}
        onExport={exportExcel}
        aiOpen={ui.aiOpen}
        onToggleAI={() => patchUi({ aiOpen: !ui.aiOpen })}
        onNewRecord={canCreate ? () => patchUi({ newRow: true }) : null}
        accessSlot={<FormAccess form={form} />}
      />

      <div className="relative flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm">
          <div className="scroll-thin min-h-0 flex-1 overflow-auto pb-36">
            {records.length === 0 && !newRow ? (
              <EmptyState
                icon={Inbox}
                title="No records yet — create your first record"
                body="Records submitted through this form will appear here as rows."
                action={
                  canCreate && (
                    <Button variant="primary" onClick={() => patchUi({ newRow: true })}>
                      <Plus size={16} /> New Record
                    </Button>
                  )
                }
              />
            ) : filtered.length === 0 && !newRow ? (
              <EmptyState icon={Inbox} title="No matching records" body="Try clearing your search or filters." />
            ) : (
              <RecordGrid
                ctx={ctx}
                form={form}
                groups={groups}
                columns={visibleColumns}
                sort={view.sort}
                onSort={onSort}
                onOpen={openRecord}
                selected={selected}
                setSelected={setSelected}
                density={view.density}
                rowColor={(r) => getRowColor(form, r)}
                startIndex={page * PAGE_SIZE}
                newRow={newRow}
              />
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
            <span>
              {selected.size > 0 && <b className="mr-2 text-indigo-600">{selected.size} selected ·</b>}
              {filtered.length === 0 ? '0 records' : `${page * PAGE_SIZE + 1}–${Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of ${filtered.length} records`}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setView({ page: page - 1 })} className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              <span className="px-1">
                Page {page + 1} of {pageCount}
              </span>
              <button disabled={page >= pageCount - 1} onClick={() => setView({ page: page + 1 })} className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {ui.aiOpen && <AIAssistant form={form} records={records} onOpenRecord={openRecord} />}
      </div>

      {panel === 'log' && (
        <FormLogPanel
          form={form}
          records={records}
          onClose={() => setPanel(null)}
          onOpenRecord={(id) => {
            setPanel(null)
            openRecord(id)
          }}
        />
      )}
      {panel === 'colors' && <ColorRulesPanel form={form} records={records} onClose={() => setPanel(null)} />}
      <WorkflowEditor open={panel === 'workflow'} form={form} onClose={() => setPanel(null)} />
    </div>
  )
}

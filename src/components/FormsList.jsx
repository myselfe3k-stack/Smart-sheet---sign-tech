import { FileSpreadsheet, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { isAdmin } from '../lib/permissions'
import { timeAgo } from '../lib/utils'
import { Avatar, Button, EmptyState } from './ui'

// Departments that work on this form (one per workflow stage team, in order).
function AssignedDepartments({ form, teams }) {
  const assigned = [...new Set(form.stages.map((s) => s.teamId))].map((id) => teams.find((t) => t.id === id)).filter(Boolean)
  if (!assigned.length) return <p className="text-xs text-gray-400">No departments assigned</p>
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Assigned departments</p>
      <div className="flex flex-wrap gap-2">
        {assigned.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-gray-700">
            <Avatar user={{ name: t.name }} size={24} />
            {t.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function FormsList() {
  const { state, patchUi, currentUser, actions } = useStore()
  const admin = isAdmin(currentUser)

  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All forms</h2>
            <p className="text-sm text-gray-500">Form templates and the records collected through them</p>
          </div>
          {admin && (
            <Button variant="primary" onClick={() => patchUi({ page: 'builder', builderFormId: null })}>
              <Plus size={16} /> New form
            </Button>
          )}
        </div>
        {state.forms.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No forms yet" body="Build your first form to start collecting records." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {state.forms.map((f) => {
              const count = state.records.filter((r) => r.formId === f.id).length
              return (
                <div key={f.id} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
                      <FileSpreadsheet size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-gray-900">{f.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {f.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{f.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AssignedDepartments form={f} teams={state.teams} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                    <span className="text-xs text-gray-400">
                      {f.fields.length} fields · {count} records · updated {timeAgo(f.updatedAt)}
                    </span>
                    <span className="flex gap-1.5">
                      {admin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`Delete "${f.name}" and its ${count} records?`)) actions.deleteForm(f.id)
                            }}
                            aria-label="Delete form"
                          >
                            <Trash2 size={13} />
                          </Button>
                          <Button size="sm" onClick={() => patchUi({ page: 'builder', builderFormId: f.id })}>
                            <Pencil size={13} /> Edit
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="primary" onClick={() => patchUi({ page: 'sheet', activeFormId: f.id })}>
                        Open sheet
                      </Button>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Pencil, Workflow } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import WorkflowEditor, { StageFlow } from './WorkflowEditor'
import { Button, EmptyState } from './ui'

// One card per form; the stage editor opens in a modal.
export default function WorkflowsPage() {
  const { state, patchUi } = useStore()
  const [editingId, setEditingId] = useState(null)
  const editing = state.forms.find((f) => f.id === editingId)

  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Workflows</h2>
          <p className="text-sm text-gray-500">Define the sequential stages each form's records move through.</p>
        </div>
        {state.forms.length === 0 ? (
          <EmptyState icon={Workflow} title="No forms yet" body="Create a form to define its workflow." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {state.forms.map((f) => {
              const records = state.records.filter((r) => r.formId === f.id)
              const active = records.filter((r) => r.workflowStatus === 'active').length
              return (
                <div key={f.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                      <Workflow size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-gray-900">{f.name}</h3>
                      <p className="text-xs text-gray-500">
                        {f.stages.length} stage{f.stages.length === 1 ? '' : 's'} · {active} of {records.length} records in flight
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex-1 rounded-xl bg-gray-50 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Flow</p>
                    <StageFlow stages={f.stages} teams={state.teams} />
                  </div>

                  <div className="mt-4 flex justify-end gap-2 border-t border-gray-50 pt-3">
                    <Button size="sm" variant="ghost" onClick={() => patchUi({ page: 'sheet', activeFormId: f.id })}>
                      Open sheet
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setEditingId(f.id)}>
                      <Pencil size={13} /> Edit workflow
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {editing && <WorkflowEditor open form={editing} onClose={() => setEditingId(null)} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, GripVertical, Lock, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { isAdmin } from '../lib/permissions'
import { cx, move, uid } from '../lib/utils'
import { Button, Modal, inputCls } from './ui'

export function StageFlow({ stages, teams }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((s, i) => {
        const team = teams.find((t) => t.id === s.teamId)
        return (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
              <span className="h-2 w-2 rounded-full" style={{ background: team?.color || '#9CA3AF' }} />
              {s.name}
            </span>
            {i < stages.length - 1 && <ArrowRight size={13} className="text-gray-300" />}
          </span>
        )
      })}
      {stages.length === 0 && <span className="text-xs text-gray-400">No stages defined</span>}
    </div>
  )
}

// Editable stage list. Calls onSave(stages) when the admin saves.
export function StageEditor({ form, onSaved }) {
  const { state, currentUser, actions } = useStore()
  const [stages, setStages] = useState(form.stages)
  const [dragIdx, setDragIdx] = useState(null)
  useEffect(() => setStages(form.stages), [form.stages])
  const admin = isAdmin(currentUser)
  const dirty = JSON.stringify(stages) !== JSON.stringify(form.stages)

  const update = (i, patch) => setStages(stages.map((s, x) => (x === i ? { ...s, ...patch } : s)))

  const save = () => {
    if (stages.some((s) => !s.name.trim() || !s.teamId)) return actions.toast('Every stage needs a name and a team', 'error')
    actions.patchForm(form.id, { stages }, `Updated workflow: ${stages.map((s) => s.name).join(' → ')}`)
    actions.toast('Workflow saved', 'success')
    onSaved?.()
  }

  return (
    <div>
      {!admin && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Lock size={13} /> Only admins can change workflow stages.
        </p>
      )}
      <ol className="space-y-2">
        {stages.map((s, i) => (
          <li
            key={s.id}
            draggable={admin}
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx !== null && dragIdx !== i) setStages(move(stages, dragIdx, i))
              setDragIdx(null)
            }}
            className={cx('flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 pl-1.5', dragIdx === i && 'opacity-40')}
          >
            <GripVertical size={15} className={cx('shrink-0 text-gray-300', admin && 'cursor-grab')} />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{i + 1}</span>
            <input disabled={!admin} className={cx(inputCls, '!py-1.5')} value={s.name} placeholder="Stage name" onChange={(e) => update(i, { name: e.target.value })} />
            <select disabled={!admin} className={cx(inputCls, '!w-40 shrink-0 !py-1.5')} value={s.teamId} onChange={(e) => update(i, { teamId: e.target.value })}>
              <option value="">Team…</option>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {admin && (
              <span className="flex shrink-0">
                <button disabled={i === 0} onClick={() => setStages(move(stages, i, i - 1))} className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up">
                  <ArrowUp size={14} />
                </button>
                <button disabled={i === stages.length - 1} onClick={() => setStages(move(stages, i, i + 1))} className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down">
                  <ArrowDown size={14} />
                </button>
                <button disabled={stages.length <= 1} onClick={() => setStages(stages.filter((_, x) => x !== i))} className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" aria-label="Remove stage">
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {admin && (
        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" onClick={() => setStages([...stages, { id: uid('st'), name: '', teamId: state.teams[0]?.id || '' }])}>
            <Plus size={13} /> Add stage
          </Button>
          <div className="flex gap-2">
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setStages(form.stages)}>
                Reset
              </Button>
            )}
            <Button size="sm" variant="primary" disabled={!dirty} onClick={save}>
              Save workflow
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4 rounded-xl bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Flow preview</p>
        <StageFlow stages={stages} teams={state.teams} />
      </div>
    </div>
  )
}

export default function WorkflowEditor({ open, form, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={`Workflow — ${form.name}`} width="max-w-2xl">
      <p className="mb-4 text-sm text-gray-500">
        Records move through these stages in order. Each stage is owned by a team; that team must fill its required fields before completing the stage.
      </p>
      <StageEditor form={form} onSaved={onClose} />
    </Modal>
  )
}

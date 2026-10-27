import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, History, Lock, RotateCcw, ThumbsDown, ThumbsUp, X, XCircle, FileText } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { missingRequiredForStage } from '../store/reducer'
import { canApprove, canCompleteStage, canEditField, canReject, canReturn } from '../lib/permissions'
import { getOverallStatus, getStage, recordTitle, stageLabel } from '../lib/records'
import { cx, formatDateTime, timeAgo } from '../lib/utils'
import { Avatar, Button, FieldInput, Pill, TeamPill, inputCls } from './ui'

function StageProgress({ form, record, teams }) {
  const done = (i) => record.workflowStatus === 'approved' || i < record.stageIndex
  return (
    <div>
      <div className="flex items-center">
        {form.stages.map((s, i) => {
          const team = teams.find((t) => t.id === s.teamId)
          const current = record.workflowStatus !== 'approved' && i === record.stageIndex
          const rejected = current && record.workflowStatus === 'rejected'
          return (
            <div key={s.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cx(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition',
                    done(i) && 'bg-emerald-500 text-white',
                    current && !rejected && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                    rejected && 'bg-red-500 text-white ring-4 ring-red-100',
                    !done(i) && !current && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {done(i) ? <Check size={14} strokeWidth={3} /> : rejected ? <X size={14} strokeWidth={3} /> : i + 1}
                </span>
              </div>
              {i < form.stages.length - 1 && (
                <div className="mx-1 h-1 flex-1 rounded-full bg-gray-100">
                  <div className={cx('h-1 rounded-full bg-emerald-500 transition-all duration-500', done(i) ? 'w-full' : 'w-0')} />
                </div>
              )}
              <span className="sr-only">{team?.name}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex">
        {form.stages.map((s, i) => (
          <span
            key={s.id}
            className={cx(
              'flex-1 truncate text-[11px] last:flex-none',
              i === record.stageIndex && record.workflowStatus === 'active' ? 'font-semibold text-indigo-700' : 'text-gray-500',
            )}
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function HistoryList({ items, users, fields }) {
  if (!items.length) return <p className="py-10 text-center text-sm text-gray-400">No history yet.</p>
  return (
    <ol className="relative space-y-4 border-l border-gray-100 pl-5">
      {items.map((h) => {
        const u = users.find((x) => x.id === h.userId)
        return (
          <li key={h.id} className="relative">
            <span className="absolute -left-[31px] top-0">
              <Avatar user={u || { name: '?', color: '#9CA3AF' }} size={22} ring />
            </span>
            <p className="text-sm text-gray-800">
              <b className="font-semibold">{u?.name || 'Unknown'}</b> <span className="text-gray-600">{h.message.charAt(0).toLowerCase() + h.message.slice(1)}</span>
              {h.type === 'form' && <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">Form</span>}
            </p>
            {h.type === 'field' && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-300">{h.from}</span>
                <span className="text-gray-400">→</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{h.to}</span>
              </p>
            )}
            <p className="mt-0.5 text-xs text-gray-400" title={formatDateTime(h.at)}>
              {formatDateTime(h.at)} · {timeAgo(h.at)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export default function RecordDrawer({ form, recordId, onClose }) {
  const { state, currentUser, actions } = useStore()
  const isNew = recordId === 'new'
  const record = state.records.find((r) => r.id === recordId)
  const baseValues = useMemo(
    () => (isNew ? Object.fromEntries(form.fields.map((f) => [f.id, f.type === 'checkbox' ? !!f.defaultValue : f.defaultValue ?? ''])) : record?.values || {}),
    [isNew, record, form.fields],
  )
  const [draft, setDraft] = useState(baseValues)
  const [tab, setTab] = useState('details')
  const [pending, setPending] = useState(null) // 'return' | 'reject' | 'approve'
  const [note, setNote] = useState('')

  useEffect(() => {
    setDraft(baseValues)
  }, [baseValues])
  useEffect(() => {
    setTab('details')
    setPending(null)
  }, [recordId])

  if (!isNew && !record) return null

  const changes = Object.fromEntries(Object.entries(draft).filter(([k, v]) => String(v ?? '') !== String(baseValues[k] ?? '')))
  const dirty = Object.keys(changes).length > 0
  const teamsInForm = [...new Set(form.fields.map((f) => f.teamId || null))]
  const stage = record && getStage(form, record)
  const merged = record && { ...record, values: { ...record.values, ...draft } }
  const missing = record && record.workflowStatus === 'active' ? missingRequiredForStage(form, merged, stage) : []
  const isLastStage = record && record.stageIndex === form.stages.length - 1
  const stageTeam = stage && state.teams.find((t) => t.id === stage.teamId)

  const history = record
    ? [...record.history, ...(form.audit || []).filter((a) => a.at >= record.createdAt)].sort((a, b) => (a.at < b.at ? 1 : -1))
    : []

  const save = () => {
    if (isNew) {
      if (actions.createRecord(form.id, draft)) onClose()
      return
    }
    actions.updateRecord(record.id, changes)
  }

  const runPending = () => {
    if (dirty) actions.updateRecord(record.id, changes)
    if (pending === 'return') actions.returnStage(record.id, note.trim())
    if (pending === 'reject') actions.reject(record.id, note.trim())
    if (pending === 'approve') actions.approve(record.id, note.trim())
    setPending(null)
    setNote('')
  }

  const complete = () => {
    if (dirty) actions.updateRecord(record.id, changes)
    actions.completeStage(record.id, changes)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/20" onMouseDown={onClose}>
      <aside className="anim-drawer flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-100 px-5 pb-4 pt-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
              <FileText size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">{form.name}</p>
              <h2 className="truncate text-lg font-semibold text-gray-900">{isNew ? 'New record' : recordTitle(form, record)}</h2>
              {!isNew && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Pill value={getOverallStatus(form, record)} />
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs font-medium text-gray-600">{stageLabel(form, record)}</span>
                  {stageTeam && record.workflowStatus === 'active' && <TeamPill team={stageTeam} />}
                </div>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close drawer">
              <X size={18} />
            </button>
          </div>

          {!isNew && (
            <div className="mt-4">
              <StageProgress form={form} record={record} teams={state.teams} />
            </div>
          )}

          {/* Workflow actions */}
          {!isNew && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {record.workflowStatus === 'active' && !isLastStage && canCompleteStage(currentUser, form, record) && (
                  <Button variant="success" disabled={missing.length > 0} onClick={complete} title={missing.length ? `Fill: ${missing.map((f) => f.label).join(', ')}` : ''}>
                    <CheckCircle2 size={15} /> Mark Stage Complete
                  </Button>
                )}
                {canApprove(currentUser, form, record) && (
                  <Button variant="success" onClick={() => setPending('approve')}>
                    <ThumbsUp size={15} /> Approve
                  </Button>
                )}
                {canReject(currentUser, record) && (
                  <Button variant="danger" onClick={() => setPending('reject')}>
                    <ThumbsDown size={15} /> Reject
                  </Button>
                )}
                {canReturn(currentUser, form, record) && (
                  <Button onClick={() => setPending('return')}>
                    <RotateCcw size={14} /> {record.workflowStatus === 'active' ? 'Return' : 'Reopen'}
                  </Button>
                )}
              </div>
              {record.workflowStatus === 'active' && !canCompleteStage(currentUser, form, record) && !canApprove(currentUser, form, record) && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Lock size={12} /> Waiting on the <b>{stageTeam?.name}</b> team to complete “{stage?.name}”.
                </p>
              )}
              {record.workflowStatus === 'active' && isLastStage && canCompleteStage(currentUser, form, record) && !canApprove(currentUser, form, record) && (
                <p className="text-xs text-gray-500">Final stage — a manager must approve or reject.</p>
              )}
              {missing.length > 0 && canCompleteStage(currentUser, form, record) && !isLastStage && (
                <p className="text-xs text-amber-700">
                  Fill required fields to complete this stage: <b>{missing.map((f) => f.label).join(', ')}</b>
                </p>
              )}
              {record.workflowStatus === 'approved' && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={13} /> Approved — workflow complete.
                </p>
              )}
              {record.workflowStatus === 'rejected' && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <XCircle size={13} /> Rejected at {stage?.name}.
                </p>
              )}
              {pending && (
                <div className="anim-rise flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row">
                  <input
                    autoFocus
                    className={inputCls}
                    placeholder={pending === 'approve' ? 'Optional comment' : pending === 'reject' ? 'Reason for rejection' : 'What needs fixing?'}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runPending()}
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => setPending(null)}>Cancel</Button>
                    <Button variant={pending === 'reject' ? 'danger' : pending === 'approve' ? 'success' : 'primary'} onClick={runPending}>
                      Confirm {pending}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        {!isNew && (
          <div className="flex gap-1 border-b border-gray-100 px-5">
            {[
              ['details', 'Details', FileText],
              ['history', `History (${history.length})`, History],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cx(
                  '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition',
                  tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
          {tab === 'history' && !isNew ? (
            <HistoryList items={history} users={state.users} fields={form.fields} />
          ) : (
            <div className="space-y-6">
              {teamsInForm.map((teamId) => {
                const team = state.teams.find((t) => t.id === teamId)
                const fields = form.fields.filter((f) => (f.teamId || null) === teamId)
                const editable = fields.some((f) => canEditField(currentUser, f))
                return (
                  <section key={teamId || 'none'}>
                    <div className="mb-3 flex items-center gap-2">
                      {team ? <TeamPill team={team} /> : <span className="text-xs font-semibold text-gray-500">Unassigned</span>}
                      <span className="text-xs text-gray-400">fields</span>
                      {!editable && (
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
                          <Lock size={11} /> Read-only for you
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {fields.map((f) => {
                        const ro = !canEditField(currentUser, f)
                        const flagged = missing?.some((m) => m.id === f.id)
                        return (
                          <div key={f.id}>
                            {f.type !== 'checkbox' && (
                              <label htmlFor={`fld_${f.id}`} className={cx('mb-1 flex items-center gap-1 text-xs font-medium', ro ? 'text-gray-400' : 'text-gray-700')}>
                                {f.label}
                                {f.required && <span className="text-red-500">*</span>}
                                {ro && <Lock size={11} />}
                                {flagged && !ro && <span className="ml-1 text-[10px] font-semibold text-amber-600">Required to complete stage</span>}
                              </label>
                            )}
                            <FieldInput field={f} value={draft[f.id]} readOnly={ro} users={state.users} onChange={(v) => setDraft((d) => ({ ...d, [f.id]: v }))} />
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
              {form.fields.length === 0 && <p className="text-sm text-gray-400">This form has no fields.</p>}
            </div>
          )}
        </div>

        {tab === 'details' && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
            <span className="text-xs text-gray-400">
              {isNew ? 'Locked fields will use their default values.' : dirty ? `${Object.keys(changes).length} unsaved change(s)` : record && `Updated ${timeAgo(record.updatedAt)}`}
            </span>
            <div className="flex gap-2">
              {dirty && !isNew && <Button onClick={() => setDraft(baseValues)}>Discard</Button>}
              <Button variant="primary" disabled={!isNew && !dirty} onClick={save}>
                {isNew ? 'Create record' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}


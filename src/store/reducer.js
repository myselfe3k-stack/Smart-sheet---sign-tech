import { seedForms, seedNotifications, seedRecords, seedTeams, seedUsers } from '../data/seed'
import { canApprove, canCompleteStage, canCreateRecord, canEditField, canReject, canReturn } from '../lib/permissions'
import { recordTitle } from '../lib/records'
import { isEmpty, nowIso, uid } from '../lib/utils'

export const initialState = {
  teams: seedTeams,
  users: seedUsers,
  forms: seedForms,
  records: seedRecords,
  notifications: seedNotifications,
  currentUserId: 'u_admin',
  viewConfigs: {},
}

// ---------- pure helpers (shared by the reducer and pre-validation in the provider) ----------

export const missingRequiredForStage = (form, record, stage) =>
  stage
    ? form.fields.filter((f) => f.required && f.teamId === stage.teamId && isEmpty(record.values[f.id]))
    : []

// Splits requested changes into allowed / blocked based on field-level permissions.
export const partitionChanges = (form, user, changes) => {
  const allowed = {}
  const blocked = []
  for (const [fieldId, value] of Object.entries(changes)) {
    const field = form.fields.find((f) => f.id === fieldId)
    if (!field) continue
    if (canEditField(user, field)) allowed[fieldId] = value
    else blocked.push(field)
  }
  return { allowed, blocked }
}

const approvalField = (form) =>
  form.fields.find((f) => f.type === 'dropdown' && f.options.includes('Approved') && f.options.includes('Rejected'))

const fmt = (v) => (isEmpty(v) ? '(empty)' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v))

const entry = (userId, type, message, extra = {}) => ({ id: uid('h'), at: nowIso(), userId, type, message, ...extra })

const notify = (form, record, teamId, message) =>
  teamId ? [{ id: uid('n'), teamId, formId: form.id, recordId: record.id, message, at: nowIso(), read: false }] : []

const ctxFor = (state, recordId, userId) => {
  const record = state.records.find((r) => r.id === recordId)
  const form = record && state.forms.find((f) => f.id === record.formId)
  const user = state.users.find((u) => u.id === userId)
  return { record, form, user }
}

const replaceRecord = (state, record, notifications = []) => ({
  ...state,
  records: state.records.map((r) => (r.id === record.id ? record : r)),
  notifications: [...notifications, ...state.notifications],
})

const diffForm = (prev, next) => {
  const msgs = []
  if (prev.name !== next.name) msgs.push(`Renamed form "${prev.name}" → "${next.name}"`)
  if (prev.description !== next.description) msgs.push('Updated form description')
  const prevById = Object.fromEntries(prev.fields.map((f) => [f.id, f]))
  const nextIds = new Set(next.fields.map((f) => f.id))
  for (const f of next.fields) {
    const p = prevById[f.id]
    if (!p) {
      msgs.push(`Added field "${f.label}"`)
      continue
    }
    if (p.label !== f.label) msgs.push(`Renamed field "${p.label}" → "${f.label}"`)
    if (p.type !== f.type) msgs.push(`Changed "${f.label}" type ${p.type} → ${f.type}`)
    if (p.required !== f.required) msgs.push(`${f.required ? 'Marked' : 'Unmarked'} "${f.label}" as required`)
    if (p.teamId !== f.teamId) msgs.push(`Reassigned "${f.label}" to another team`)
    if (JSON.stringify(p.options) !== JSON.stringify(f.options)) msgs.push(`Updated options for "${f.label}"`)
    if (p.defaultValue !== f.defaultValue) msgs.push(`Changed default value of "${f.label}"`)
    if ((p.description || '') !== (f.description || '')) msgs.push(`Updated AI description of "${f.label}"`)
  }
  for (const f of prev.fields) if (!nextIds.has(f.id)) msgs.push(`Removed field "${f.label}"`)
  if (prev.fields.map((f) => f.id).join() !== next.fields.filter((f) => prevById[f.id]).map((f) => f.id).join() && msgs.length === 0)
    msgs.push('Reordered fields')
  if (prev.colorFieldId !== next.colorFieldId) {
    const f = next.fields.find((x) => x.id === next.colorFieldId)
    msgs.push(f ? `Rows now colored by "${f.label}"` : 'Turned off row coloring')
  }
  for (const f of next.fields) {
    const p = prevById[f.id]
    if (p && JSON.stringify(p.optionColors) !== JSON.stringify(f.optionColors)) msgs.push(`Updated option colors for "${f.label}"`)
  }
  if (prev.status !== next.status && next.status === 'published') msgs.push('Published form')
  return msgs
}

// ---------- reducer ----------

export function reducer(state, action) {
  const p = action.payload || {}
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: p.userId }

    case 'CREATE_RECORD': {
      const form = state.forms.find((f) => f.id === p.formId)
      const user = state.users.find((u) => u.id === p.userId)
      if (!form || !user || !canCreateRecord(user, form)) return state
      const values = {}
      for (const f of form.fields) {
        const requested = p.values?.[f.id]
        // Enforced: only editable fields accept user input; the rest get their defaults.
        values[f.id] = canEditField(user, f) && requested !== undefined ? requested : f.defaultValue ?? ''
        if (f.type === 'checkbox') values[f.id] = !!values[f.id]
      }
      const record = {
        id: p.id || uid('rec'),
        formId: form.id,
        values,
        stageIndex: 0,
        workflowStatus: 'active',
        createdBy: user.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        history: [entry(user.id, 'create', 'Created record')],
      }
      const first = form.stages[0]
      return {
        ...state,
        records: [record, ...state.records],
        notifications: [
          ...notify(form, record, first?.teamId, `${recordTitle(form, record)} is ready for ${first?.name}`),
          ...state.notifications,
        ],
      }
    }

    case 'UPDATE_RECORD': {
      const { record, form, user } = ctxFor(state, p.recordId, p.userId)
      if (!record || !form || !user) return state
      const { allowed } = partitionChanges(form, user, p.changes || {})
      const history = []
      const values = { ...record.values }
      for (const [fieldId, value] of Object.entries(allowed)) {
        if (fmt(values[fieldId]) === fmt(value)) continue
        const f = form.fields.find((x) => x.id === fieldId)
        history.push(
          entry(user.id, 'field', `Changed ${f.label}`, { fieldId, from: fmt(values[fieldId]), to: fmt(value) }),
        )
        values[fieldId] = value
      }
      if (!history.length) return state
      return replaceRecord(state, { ...record, values, updatedAt: nowIso(), history: [...record.history, ...history] })
    }

    case 'COMPLETE_STAGE': {
      const { record, form, user } = ctxFor(state, p.recordId, p.userId)
      if (!record || !canCompleteStage(user, form, record)) return state
      const stage = form.stages[record.stageIndex]
      const isLast = record.stageIndex >= form.stages.length - 1
      if (isLast || missingRequiredForStage(form, record, stage).length) return state
      const next = form.stages[record.stageIndex + 1]
      const updated = {
        ...record,
        stageIndex: record.stageIndex + 1,
        updatedAt: nowIso(),
        history: [...record.history, entry(user.id, 'stage', `Completed ${stage.name} → moved to ${next.name}`)],
      }
      return replaceRecord(
        state,
        updated,
        notify(form, updated, next.teamId, `${recordTitle(form, updated)} is ready for ${next.name}`),
      )
    }

    case 'RETURN_STAGE': {
      const { record, form, user } = ctxFor(state, p.recordId, p.userId)
      if (!record || !canReturn(user, form, record)) return state
      const af = approvalField(form)
      let updated
      if (record.workflowStatus !== 'active') {
        const stageIndex = Math.min(record.stageIndex, form.stages.length - 1)
        updated = {
          ...record,
          stageIndex,
          workflowStatus: 'active',
          values: af ? { ...record.values, [af.id]: 'Pending' } : record.values,
          history: [
            ...record.history,
            entry(user.id, 'stage', `Reopened record at ${form.stages[stageIndex].name}${p.note ? ` — "${p.note}"` : ''}`),
          ],
        }
      } else {
        const from = form.stages[record.stageIndex]
        const to = form.stages[record.stageIndex - 1]
        updated = {
          ...record,
          stageIndex: record.stageIndex - 1,
          history: [
            ...record.history,
            entry(user.id, 'stage', `Returned from ${from.name} to ${to.name}${p.note ? ` — "${p.note}"` : ''}`),
          ],
        }
      }
      updated.updatedAt = nowIso()
      const target = form.stages[updated.stageIndex]
      return replaceRecord(
        state,
        updated,
        notify(form, updated, target.teamId, `${recordTitle(form, updated)} was returned to ${target.name}`),
      )
    }

    case 'APPROVE':
    case 'REJECT': {
      const { record, form, user } = ctxFor(state, p.recordId, p.userId)
      if (!record) return state
      const approving = action.type === 'APPROVE'
      if (approving ? !canApprove(user, form, record) : !canReject(user, record)) return state
      const af = approvalField(form)
      const updated = {
        ...record,
        workflowStatus: approving ? 'approved' : 'rejected',
        stageIndex: approving ? form.stages.length : record.stageIndex,
        values: af ? { ...record.values, [af.id]: approving ? 'Approved' : 'Rejected' } : record.values,
        updatedAt: nowIso(),
        history: [
          ...record.history,
          entry(user.id, 'approval', `${approving ? 'Approved' : 'Rejected'} record${p.note ? ` — "${p.note}"` : ''}`),
        ],
      }
      return replaceRecord(
        state,
        updated,
        notify(form, updated, form.stages[0]?.teamId, `${recordTitle(form, updated)} was ${approving ? 'approved' : 'rejected'}`),
      )
    }

    case 'SAVE_FORM': {
      const existing = state.forms.find((f) => f.id === p.form.id)
      const at = nowIso()
      if (!existing) {
        const form = {
          ...p.form,
          createdAt: at,
          updatedAt: at,
          audit: [{ id: uid('fa'), at, userId: p.userId, type: 'form', message: `Created form "${p.form.name}"` }],
        }
        return { ...state, forms: [...state.forms, form] }
      }
      const msgs = diffForm(existing, p.form)
      const form = {
        ...existing,
        ...p.form,
        updatedAt: at,
        audit: [...existing.audit, ...msgs.map((message) => ({ id: uid('fa'), at, userId: p.userId, type: 'form', message }))],
      }
      return { ...state, forms: state.forms.map((f) => (f.id === form.id ? form : f)) }
    }

    case 'PATCH_FORM': {
      const at = nowIso()
      return {
        ...state,
        forms: state.forms.map((f) =>
          f.id !== p.formId
            ? f
            : {
                ...f,
                ...p.patch,
                updatedAt: at,
                audit: p.message ? [...f.audit, { id: uid('fa'), at, userId: p.userId, type: 'form', message: p.message }] : f.audit,
              },
        ),
        // Keep active records inside the (possibly shortened) stage list.
        records: p.patch.stages
          ? state.records.map((r) =>
              r.formId === p.formId && r.workflowStatus === 'active' && r.stageIndex >= p.patch.stages.length
                ? { ...r, stageIndex: Math.max(0, p.patch.stages.length - 1) }
                : r,
            )
          : state.records,
      }
    }

    case 'DELETE_FORM':
      return {
        ...state,
        forms: state.forms.filter((f) => f.id !== p.formId),
        records: state.records.filter((r) => r.formId !== p.formId),
      }

    case 'SAVE_TEAM':
      return state.teams.some((t) => t.id === p.team.id)
        ? { ...state, teams: state.teams.map((t) => (t.id === p.team.id ? p.team : t)) }
        : { ...state, teams: [...state.teams, p.team] }

    case 'SAVE_USER':
      return state.users.some((u) => u.id === p.user.id)
        ? { ...state, users: state.users.map((u) => (u.id === p.user.id ? p.user : u)) }
        : { ...state, users: [...state.users, p.user] }

    case 'DELETE_USER':
      return { ...state, users: state.users.filter((u) => u.id !== p.userId) }

    case 'MARK_READ':
      return { ...state, notifications: state.notifications.map((n) => (p.ids.includes(n.id) ? { ...n, read: true } : n)) }

    case 'SET_VIEW_CONFIG':
      return { ...state, viewConfigs: { ...state.viewConfigs, [p.formId]: { ...state.viewConfigs[p.formId], ...p.config } } }

    default:
      return state
  }
}

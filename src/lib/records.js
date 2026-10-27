import { VIRTUAL_FIELDS } from '../data/models'
import { formatDate, isEmpty, todayStr } from './utils'

export const getStage = (form, record) => form.stages[record.stageIndex] || null

export const isFinished = (record) => record.workflowStatus !== 'active'

// Priority/status are ordinary dropdowns; they're recognised by label for flags, risk and overall status.
const isDropdownNamed = (f, re) => f.type === 'dropdown' && re.test(f.label)

export const priorityField = (form) => form.fields.find((f) => isDropdownNamed(f, /priority/i))

// Only a deadline-like date counts for "overdue" (a "Reported On" or "Start Date" in the past isn't late).
export const dueDateField = (form) => form.fields.find((f) => f.type === 'date' && /due|deadline|needed by/i.test(f.label))

export const titleField = (form) => form.fields.find((f) => f.type === 'text') || form.fields[0]

export const recordTitle = (form, record) => {
  const f = titleField(form)
  return (f && record.values[f.id]) || 'Untitled record'
}

export const isHighPriority = (form, record) => {
  const f = priorityField(form)
  return !!f && record.values[f.id] === 'High'
}

export const isOverdue = (form, record) => {
  const f = dueDateField(form)
  if (!f || isFinished(record)) return false
  const v = record.values[f.id]
  return !isEmpty(v) && v < todayStr()
}

// Overall status: the status field owned by the team of the active stage drives it.
export const getOverallStatus = (form, record) => {
  if (record.workflowStatus === 'approved') return 'Complete'
  if (record.workflowStatus === 'rejected') return 'Rejected'
  const stage = getStage(form, record)
  if (!stage) return 'Complete'
  const statusField = form.fields.find((f) => isDropdownNamed(f, /status/i) && f.teamId === stage.teamId)
  if (statusField) return record.values[statusField.id] || 'Not Started'
  return record.stageIndex === 0 ? 'In Progress' : 'Pending'
}

export const stageLabel = (form, record) => {
  if (record.workflowStatus === 'approved') return 'Approved'
  if (record.workflowStatus === 'rejected') return 'Rejected'
  return getStage(form, record)?.name || '—'
}

export const assignedTeamId = (form, record) => (isFinished(record) ? null : getStage(form, record)?.teamId || null)

// Grid columns are the form's own fields.
export const allColumns = (form) => [...form.fields]

export const fieldById = (form, id) =>
  form.fields.find((f) => f.id === id) || VIRTUAL_FIELDS.find((v) => v.id === id)

export const getValue = (ctx, form, record, fieldId) => {
  if (fieldId === '__status') return getOverallStatus(form, record)
  if (fieldId === '__stage') return stageLabel(form, record)
  if (fieldId === '__team') {
    const t = ctx.teams.find((x) => x.id === assignedTeamId(form, record))
    return t ? t.name : ''
  }
  return record.values[fieldId]
}

export const displayValue = (ctx, field, value) => {
  if (isEmpty(value)) return ''
  switch (field.type) {
    case 'date':
      return formatDate(value)
    case 'checkbox':
      return value ? 'Yes' : 'No'
    case 'user':
      return ctx.users.find((u) => u.id === value)?.name || value
    default:
      return String(value)
  }
}

export const compareValues = (a, b) => {
  if (isEmpty(a) && isEmpty(b)) return 0
  if (isEmpty(a)) return 1
  if (isEmpty(b)) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }
export const sortValue = (field, value) =>
  field?.type === 'dropdown' && /priority/i.test(field.label) && value in PRIORITY_RANK ? PRIORITY_RANK[value] : value

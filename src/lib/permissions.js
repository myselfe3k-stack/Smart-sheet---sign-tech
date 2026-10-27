import { getStage } from './records'

export const isAdmin = (user) => user?.role === 'admin'
export const isManager = (user) => user?.role === 'manager' || isAdmin(user)

// Field-level permission: users may edit only fields assigned to their team.
export const canEditField = (user, field) => {
  if (!user || !field) return false
  if (isAdmin(user)) return true
  return !!field.teamId && field.teamId === user.teamId
}

// New records start at the first stage, so only that stage's team (or an admin) can create them.
export const canCreateRecord = (user, form) => isAdmin(user) || (!!user?.teamId && user.teamId === form?.stages[0]?.teamId)

export const isActiveTeamMember = (user, form, record) => {
  if (record.workflowStatus !== 'active') return false
  const stage = getStage(form, record)
  return !!stage && (isAdmin(user) || user.teamId === stage.teamId)
}

export const canCompleteStage = (user, form, record) => isActiveTeamMember(user, form, record)

export const canApprove = (user, form, record) =>
  isManager(user) && record.workflowStatus === 'active' && record.stageIndex === form.stages.length - 1

export const canReject = (user, record) => isManager(user) && record.workflowStatus === 'active'

export const canReturn = (user, form, record) => {
  if (record.workflowStatus === 'rejected') return isManager(user)
  if (record.workflowStatus === 'approved') return isManager(user)
  return record.stageIndex > 0 && (isActiveTeamMember(user, form, record) || isManager(user))
}

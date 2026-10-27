import { assignedTeamId, displayValue, getOverallStatus, isHighPriority, isOverdue, recordTitle, stageLabel } from './records'
import { todayStr } from './utils'

// Compact snapshot of the open sheet that Claude answers from.
export function buildSheetContext(form, records, ctx, user) {
  const team = (id) => ctx.teams.find((t) => t.id === id)?.name || null
  return {
    today: todayStr(),
    currentUser: { name: user.name, role: user.role, team: team(user.teamId) },
    form: {
      name: form.name,
      description: form.description,
      stages: form.stages.map((s) => ({ name: s.name, team: team(s.teamId) })),
      fields: form.fields.map((f) => ({ label: f.label, type: f.type, team: team(f.teamId), required: f.required })),
    },
    records: records.map((r) => ({
      title: recordTitle(form, r),
      stage: stageLabel(form, r),
      assignedTeam: team(assignedTeamId(form, r)),
      status: getOverallStatus(form, r),
      workflowStatus: r.workflowStatus,
      overdue: isOverdue(form, r),
      highPriority: isHighPriority(form, r),
      updatedAt: r.updatedAt,
      values: Object.fromEntries(form.fields.map((f) => [f.label, displayValue(ctx, f, r.values[f.id]) || null])),
    })),
  }
}

/**
 * Streams Claude's reply. Calls onText with each chunk.
 * Returns { ok: true } or { ok: false, notConfigured?: boolean, error?: string }.
 */
export async function streamChat({ messages, context, onText, signal }) {
  let res
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') return { ok: true }
    return { ok: false, notConfigured: true }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // 404 = no chat endpoint (e.g. a static host); 503 = no API credentials.
    if (res.status === 404 || res.status === 503) return { ok: false, notConfigured: true }
    return { ok: false, error: body.error || `Request failed (${res.status})` }
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      onText(decoder.decode(value, { stream: true }))
    }
  } catch (err) {
    if (err.name !== 'AbortError') return { ok: false, error: 'The connection dropped mid-reply.' }
  }
  return { ok: true }
}

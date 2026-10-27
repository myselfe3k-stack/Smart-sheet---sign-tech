// Rule-based offline answers, used by the chat when no Claude API key is configured.
import {
  assignedTeamId, displayValue, dueDateField, getOverallStatus, isHighPriority, isOverdue, priorityField, recordTitle, stageLabel,
} from './records'
import { formatDate, todayStr } from './utils'

const STOP_WORDS = new Set(['ltd', 'inc', 'corp', 'company', 'the', 'and', 'for', 'with', 'what', 'status', 'lead', 'record'])

// Records whose text values (name, company, email…) are mentioned in the question.
const mentionedRecords = (question, form, records) => {
  const words = new Set(question.toLowerCase().match(/[a-z0-9@.]+/g) || [])
  const textFields = form.fields.filter((f) => ['text', 'email', 'url'].includes(f.type))
  return records.filter((r) =>
    textFields.some((f) =>
      String(r.values[f.id] ?? '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .some((tok) => tok.length >= 3 && !STOP_WORDS.has(tok) && words.has(tok)),
    ),
  )
}

const describeRecord = (form, ctx, r) => {
  const team = ctx.teams.find((t) => t.id === assignedTeamId(form, r))?.name
  const pf = priorityField(form)
  const df = dueDateField(form)
  const company = form.fields.find((f) => f.type === 'text' && f !== form.fields.find((x) => x.type === 'text') && /company/i.test(f.label))
  const parts = [
    `status **${getOverallStatus(form, r)}**`,
    `stage **${stageLabel(form, r)}**`,
    team && `waiting on **${team}**`,
    pf && r.values[pf.id] && `${r.values[pf.id]} priority`,
    df && r.values[df.id] && `due ${formatDate(r.values[df.id])}${isOverdue(form, r) ? ' (overdue)' : ''}`,
  ].filter(Boolean)
  const companyName = company && displayValue(ctx, company, r.values[company.id])
  return `**${recordTitle(form, r)}**${companyName ? ` (${companyName})` : ''} — ${parts.join(', ')}.`
}

const daysOverdue = (form, r) => {
  const f = dueDateField(form)
  if (!f || !r.values[f.id]) return 0
  return Math.round((new Date(todayStr()) - new Date(r.values[f.id])) / 86400000)
}

export const riskReasons = (form, r) => {
  const reasons = []
  let score = 0
  const status = getOverallStatus(form, r)
  if (isOverdue(form, r)) {
    const d = daysOverdue(form, r)
    reasons.push(`${d} day${d === 1 ? '' : 's'} overdue`)
    score += 3 + d * 0.1
  }
  if (isHighPriority(form, r) && r.workflowStatus === 'active') {
    reasons.push('high priority')
    score += 2
  }
  if (r.workflowStatus === 'rejected') {
    reasons.push('rejected')
    score += 3
  }
  if (status === 'Pending') {
    reasons.push('pending')
    score += 1
  }
  if (status === 'On Hold') {
    reasons.push('on hold')
    score += 1.5
  }
  return { score, reasons }
}

const item = (form, ctx, r, reasons) => {
  const team = ctx.teams.find((t) => t.id === assignedTeamId(form, r))
  return { recordId: r.id, title: recordTitle(form, r), reasons, team: team?.name }
}

// `lastRecordIds` = records the previous answer was about, so follow-ups like "the same" or "his due date" work.
export function answerQuestion(question, { form, records, ctx, lastRecordIds = [] }) {
  const q = question.toLowerCase().trim()
  const example = recordTitle(form, records[0] || { values: {} })

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q) && q.split(/\s+/).length <= 3)
    return {
      text: `Hi! Ask me about ${form.name} — a record's status (e.g. “status of ${example}”), a field like “IT status of ${example}”, what's overdue, or the top risks.`,
      items: [],
    }
  if (/^(how are you|how's it going|how are things)\b/.test(q))
    return { text: `Doing well, thanks! Want a quick rundown of ${form.name}, or the status of a particular lead?`, items: [] }
  if (/^(thanks|thank you|thx|cheers)\b/.test(q)) return { text: 'Happy to help — ask me anything else about this sheet.', items: [] }
  if (/^(who|what) are you\b/.test(q))
    return { text: `I'm the Difinity Flow Sheet assistant. I can look up records in ${form.name}, check fields and statuses, and point out risks.`, items: [] }

  // A specific field asked for by label ("IT status", "due date"…), longest label first.
  const fieldsByLength = [...form.fields].sort((a, b) => b.label.length - a.label.length)
  const askedField = fieldsByLength.find((f) => q.includes(f.label.toLowerCase()))
  const rest = askedField ? q.replace(askedField.label.toLowerCase(), ' ') : q

  let targets = mentionedRecords(rest, form, records)
  if (!targets.length && lastRecordIds.length && /\b(same|that|this|it|its|they|them|those|these|he|she|him|her|his|their)\b/.test(rest))
    targets = records.filter((r) => lastRecordIds.includes(r.id))

  if (targets.length && targets.length <= 5) {
    const recordIds = targets.map((r) => r.id)
    if (askedField)
      return {
        text: targets
          .map((r) => `**${recordTitle(form, r)}** — ${askedField.label}: **${displayValue(ctx, askedField, r.values[askedField.id]) || 'not filled in yet'}**`)
          .join('\n'),
        items: [],
        recordIds,
      }
    return { text: targets.map((r) => describeRecord(form, ctx, r)).join('\n'), items: [], recordIds }
  }

  const nMatch = q.match(/\b(top|first)?\s*(\d+)\b/)
  const n = Math.min(10, Math.max(1, Number(nMatch?.[2]) || 3))

  if (/risk|concern|problem|attention|worry/.test(q)) {
    const ranked = records
      .filter((r) => r.workflowStatus !== 'approved')
      .map((r) => ({ r, ...riskReasons(form, r) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
    if (!ranked.length) return { text: 'Good news — I found no overdue, high-priority, rejected or pending records right now.', items: [] }
    return {
      text: `Here are the top ${ranked.length} risks in ${form.name}, ranked by overdue days, priority and status:`,
      items: ranked.map((x) => item(form, ctx, x.r, x.reasons)),
    }
  }

  if (/overdue|late|past due|deadline/.test(q)) {
    const list = records.filter((r) => isOverdue(form, r)).sort((a, b) => daysOverdue(form, b) - daysOverdue(form, a))
    return {
      text: list.length ? `${list.length} record${list.length === 1 ? ' is' : 's are'} overdue:` : 'Nothing is overdue. 🎉',
      items: list.map((r) => item(form, ctx, r, [`${daysOverdue(form, r)} days overdue`])),
    }
  }

  if (/reject/.test(q)) {
    const list = records.filter((r) => r.workflowStatus === 'rejected')
    return { text: list.length ? `${list.length} rejected record(s):` : 'No records have been rejected.', items: list.map((r) => item(form, ctx, r, ['rejected'])) }
  }

  if (/high|urgent|priority/.test(q)) {
    const list = records.filter((r) => isHighPriority(form, r) && r.workflowStatus === 'active')
    return {
      text: `${list.length} active high-priority record(s):`,
      items: list.map((r) => item(form, ctx, r, [getOverallStatus(form, r)])),
    }
  }

  if (/team|waiting|awaiting|bottleneck|who|queue/.test(q)) {
    const counts = ctx.teams
      .map((t) => ({ t, c: records.filter((r) => assignedTeamId(form, r) === t.id).length }))
      .filter((x) => x.c > 0)
      .sort((a, b) => b.c - a.c)
    const top = counts[0]
    return {
      text: top
        ? `${top.t.name} has the longest queue with ${top.c} record(s) awaiting action. Breakdown: ${counts.map((x) => `${x.t.name} ${x.c}`).join(' · ')}.`
        : 'No team has records awaiting action.',
      items: [],
    }
  }

  // Default: summary
  const byStatus = {}
  for (const r of records) {
    const s = getOverallStatus(form, r)
    byStatus[s] = (byStatus[s] || 0) + 1
  }
  const overdue = records.filter((r) => isOverdue(form, r)).length
  return {
    text: `${form.name} has ${records.length} records. ${Object.entries(byStatus)
      .map(([s, c]) => `${c} ${s}`)
      .join(', ')}. ${overdue} overdue. Try asking “What are the top 3 risks?” or “Which team is the bottleneck?”`,
    items: [],
  }
}

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, RotateCcw, Square, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { answerQuestion } from '../lib/ai'
import { buildSheetContext, streamChat } from '../lib/aiClient'
import { recordTitle } from '../lib/records'
import { cx, uid } from '../lib/utils'
import { Avatar } from './ui'
import logo from '../assets/logo.png'

const SUGGESTIONS = ['What are the top 3 risks?', 'What is overdue?', 'Which team is the bottleneck?', 'Summarize this sheet']

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Inline formatting: **bold** and clickable record titles.
function Inline({ text, linker }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return (
        <strong key={i} className="font-semibold text-gray-900">
          <Inline text={part.slice(2, -2)} linker={linker} />
        </strong>
      )
    if (!linker.re) return <Fragment key={i}>{part}</Fragment>
    return (
      <Fragment key={i}>
        {part.split(linker.re).map((chunk, j) =>
          linker.ids[chunk] ? (
            <button key={j} onClick={() => linker.open(linker.ids[chunk])} className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900">
              {chunk}
            </button>
          ) : (
            <Fragment key={j}>{chunk}</Fragment>
          ),
        )}
      </Fragment>
    )
  })
}

// Minimal markdown: paragraphs and bullet/numbered lists.
function RichText({ text, linker }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (item) {
      if (last?.type === 'list') last.items.push(item[1])
      else blocks.push({ type: 'list', ordered: /^\s*\d/.test(line), items: [item[1]] })
    } else if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
      {blocks.map((b, i) => {
        if (b.type === 'p')
          return (
            <p key={i}>
              <Inline text={b.text} linker={linker} />
            </p>
          )
        const List = b.ordered ? 'ol' : 'ul'
        return (
          <List key={i} className={cx('space-y-1 pl-5', b.ordered ? 'list-decimal' : 'list-disc', 'marker:text-brand-400')}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inline text={it} linker={linker} />
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}

// Rule-based reply used when no Claude API key is configured.
const offlineReply = (question, data) => {
  const a = answerQuestion(question, data)
  const lines = a.items.map((it) => `- **${it.title}** — ${[...it.reasons, it.team && `with ${it.team}`].filter(Boolean).join(' · ')}`)
  return { content: [a.text, ...lines].join('\n'), recordIds: a.recordIds || a.items.map((it) => it.recordId) }
}

const AiBadge = () => (
  <span className="bg-ai flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
    <img src={logo} alt="" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
  </span>
)

export default function AIAssistant({ form, records, onOpenRecord }) {
  const { state, currentUser, patchUi } = useStore()
  const [chat, setChat] = useState([]) // { id, role, content, offline?, error? }
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const ctx = { teams: state.teams, users: state.users }

  const linker = useMemo(() => {
    const ids = Object.fromEntries(records.map((r) => [recordTitle(form, r), r.id]))
    const titles = Object.keys(ids).filter((t) => t && t !== 'Untitled record').sort((a, b) => b.length - a.length)
    return { ids, re: titles.length ? new RegExp(`(${titles.map(escapeRe).join('|')})`, 'g') : null, open: onOpenRecord }
  }, [records, form, onOpenRecord])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat])

  // A new sheet or user means a new context; start a fresh conversation.
  useEffect(() => {
    abortRef.current?.abort()
    setChat([])
    setBusy(false)
  }, [form.id, currentUser.id])

  const updateLast = (fn) => setChat((c) => c.map((m, i) => (i === c.length - 1 ? fn(m) : m)))

  const ask = async (q = question) => {
    const text = q.trim()
    if (!text || busy) return
    setQuestion('')
    const userMsg = { id: uid('m'), role: 'user', content: text }
    // Error bubbles stay on screen but aren't sent to Claude as conversation history.
    const history = [...chat.filter((m) => !m.error && m.content), userMsg]
    setChat([...chat, userMsg, { id: uid('m'), role: 'assistant', content: '' }])
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller

    const result = await streamChat({
      messages: history.map(({ role, content }) => ({ role, content })),
      context: buildSheetContext(form, records, ctx, currentUser),
      signal: controller.signal,
      onText: (chunk) => updateLast((m) => ({ ...m, content: m.content + chunk })),
    })
    if (!result.ok && result.notConfigured) {
      const lastRecordIds = [...chat].reverse().find((m) => m.recordIds?.length)?.recordIds || []
      updateLast((m) => ({ ...m, ...offlineReply(text, { form, records, ctx, lastRecordIds }), offline: true }))
    }
    else if (!result.ok) updateLast((m) => ({ ...m, content: result.error, error: true }))
    setBusy(false)
  }

  const stop = () => abortRef.current?.abort()
  const clear = () => {
    stop()
    setChat([])
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex flex-col items-center gap-2 px-6">
      {chat.length > 0 && (
        <div className="anim-rise pointer-events-auto flex max-h-[55vh] w-full max-w-[680px] flex-col rounded-2xl bg-white shadow-xl shadow-brand-900/10 ring-1 ring-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
            <AiBadge />
            <p className="flex-1 text-sm font-semibold text-gray-900">
              Difinity AI <span className="font-normal text-gray-400">· {form.name}</span>
            </p>
            <button onClick={clear} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" title="Start a new conversation">
              <RotateCcw size={12} /> New chat
            </button>
          </div>
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {chat.map((m, i) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2 text-sm text-white">{m.content}</p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <AiBadge />
                  <div className="min-w-0 flex-1 pt-1">
                    {m.content ? (
                      m.error ? (
                        <p className="text-sm text-red-600">{m.content}</p>
                      ) : (
                        <RichText text={m.content} linker={linker} />
                      )
                    ) : busy && i === chat.length - 1 ? (
                      <span className="loading-text text-sm font-medium">Loading info…</span>
                    ) : (
                      <span className="text-sm text-gray-400">Stopped.</span>
                    )}
                    {m.offline && (
                      <p className="mt-2 text-[11px] text-gray-400">Offline answer — add an Anthropic API key to get AI replies.</p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-auto w-full max-w-[680px]">
        {chat.length === 0 && (
          <div className="mb-2 flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 backdrop-blur transition hover:text-brand-700 hover:ring-brand-200">
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask()
          }}
          className="flex items-center gap-3 rounded-2xl bg-white py-2 pl-2 pr-2 shadow-xl shadow-brand-900/10 ring-1 ring-gray-100"
        >
          <Avatar user={currentUser} size={34} />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={chat.length ? 'Ask a follow-up…' : 'What are the top 3 risks?'}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            aria-label="Ask AI about this sheet"
          />
          <button type="button" onClick={() => patchUi({ aiOpen: false })} className="rounded-lg p-1.5 text-gray-300 hover:text-gray-500" aria-label="Hide AI assistant">
            <X size={15} />
          </button>
          {busy ? (
            <button type="button" onClick={stop} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 text-white shadow-md hover:bg-gray-900" aria-label="Stop reply">
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className="bg-ai flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md transition hover:scale-105" aria-label="Send">
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

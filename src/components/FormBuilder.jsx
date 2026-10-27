import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Eye, GripVertical, Hammer, Lock, Palette, Plus, Send, Trash2, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { FIELD_TYPES, defaultOptionsFor, optionColorsFor, suggestOptionColor, typeHasOptions } from '../data/models'
import { isAdmin } from '../lib/permissions'
import { cx, move, uid } from '../lib/utils'
import { Button, EmptyState, FieldInput, SwatchPicker, Toggle, inputCls } from './ui'

const newField = (type = 'text', teamId = '') => ({
  id: uid('f'),
  label: '',
  type,
  required: false,
  defaultValue: type === 'checkbox' ? false : '',
  options: defaultOptionsFor(type),
  optionColors: optionColorsFor(defaultOptionsFor(type)),
  teamId,
})

const blankForm = (teams) => ({
  id: uid('form'),
  name: '',
  description: '',
  status: 'draft',
  fields: [{ ...newField('text', teams[0]?.id || ''), label: 'Title', required: true }],
  stages: [],
  colorFieldId: null,
  defaultColor: '#FFFFFF',
  audit: [],
})

function OptionsEditor({ options, colors = {}, onChange }) {
  const [val, setVal] = useState('')
  const add = () => {
    const v = val.trim()
    if (v && !options.includes(v)) onChange([...options, v], { ...colors, [v]: suggestOptionColor(v, options.length) })
    setVal('')
  }
  const remove = (o) => {
    const { [o]: _, ...rest } = colors
    onChange(options.filter((x) => x !== o), rest)
  }
  return (
    <div>
      <ul className="mb-2 space-y-1">
        {options.map((o, i) => (
          <li key={o} className="flex items-center gap-2 rounded-lg px-2 py-1 ring-1 ring-black/5" style={{ background: colors[o] || suggestOptionColor(o, i) }}>
            <SwatchPicker value={colors[o] || suggestOptionColor(o, i)} onChange={(c) => onChange(options, { ...colors, [o]: c })} label={`Color for ${o}`} />
            <span className="flex-1 truncate text-sm text-gray-800">{o}</span>
            <button onClick={() => remove(o)} className="rounded p-0.5 text-gray-500 hover:text-red-600" aria-label={`Remove ${o}`}>
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input className={cx(inputCls, '!py-1.5')} placeholder="Add option and press Enter" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <Button size="sm" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  )
}

function FieldCard({ field, index, total, teams, users, onChange, onRemove, onMove, dragProps, dragging, colorsRows, onColorRows }) {
  const [open, setOpen] = useState(!field.label)
  return (
    <li {...dragProps} className={cx('rounded-xl border border-gray-200 bg-white shadow-sm transition', dragging && 'opacity-40')}>
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <GripVertical size={16} className="cursor-grab text-gray-300" />
        <input className={cx(inputCls, '!w-auto min-w-[140px] flex-1 !py-1.5 font-medium')} placeholder="Field label" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        <select
          className={cx(inputCls, '!w-36 !py-1.5')}
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value, options: defaultOptionsFor(e.target.value), optionColors: optionColorsFor(defaultOptionsFor(e.target.value)), defaultValue: e.target.value === 'checkbox' ? false : '' })}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select className={cx(inputCls, '!w-36 !py-1.5')} value={field.teamId || ''} onChange={(e) => onChange({ teamId: e.target.value || null })}>
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Toggle checked={field.required} onChange={(required) => onChange({ required })} label="Required" />
        {colorsRows && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
            <Palette size={11} /> Colors rows
          </span>
        )}
        <span className="ml-auto flex items-center">
          <button disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up">
            <ArrowUp size={14} />
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down">
            <ArrowDown size={14} />
          </button>
          <button onClick={() => setOpen((o) => !o)} className="rounded p-1 text-gray-400 hover:text-gray-700" aria-label="Field settings">
            <ChevronDown size={15} className={cx('transition', open && 'rotate-180')} />
          </button>
          <button onClick={onRemove} className="rounded p-1 text-gray-400 hover:text-red-500" aria-label="Remove field">
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Default value</label>
            <FieldInput field={{ ...field, label: 'Checked by default' }} value={field.defaultValue} users={users} onChange={(defaultValue) => onChange({ defaultValue })} />
          </div>
          {typeHasOptions(field.type) && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Options & colors</label>
              <OptionsEditor options={field.options} colors={field.optionColors} onChange={(options, optionColors) => onChange({ options, optionColors })} />
              <div className="mt-3 rounded-lg bg-violet-50/70 p-2.5">
                <Toggle checked={colorsRows} onChange={onColorRows} label="Color the entire row by this field" />
                <p className="mt-1 pl-11 text-[11px] text-gray-500">Only one field per form can drive row colors.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default function FormBuilder() {
  const { state, ui, patchUi, currentUser, actions } = useStore()
  const existing = state.forms.find((f) => f.id === ui.builderFormId)
  const [draft, setDraft] = useState(() => (existing ? structuredClone(existing) : blankForm(state.teams)))
  const [mode, setMode] = useState('build')
  const [dragIdx, setDragIdx] = useState(null)
  const [withData, setWithData] = useState(false)
  const [initial, setInitial] = useState({})

  if (!isAdmin(currentUser))
    return <EmptyState icon={Lock} title="Admins only" body="Switch to the Admin user from the top bar to build or edit forms." />

  const setFields = (fields) => setDraft((d) => ({ ...d, fields }))
  const updateField = (id, patch) => setFields(draft.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const validate = () => {
    if (!draft.name.trim()) return 'Give your form a name'
    if (!draft.fields.length) return 'Add at least one field'
    if (draft.fields.some((f) => !f.label.trim())) return 'Every field needs a label'
    if (draft.fields.some((f) => typeHasOptions(f.type) && !f.options.length)) return 'Dropdown fields need at least one option'
    return null
  }

  const submit = (status) => {
    const err = validate()
    if (err) return actions.toast(err, 'error')
    let stages = draft.stages
    if (!stages.length) {
      // Default workflow: one stage per team in the order the fields reference them.
      const teamIds = [...new Set(draft.fields.map((f) => f.teamId).filter(Boolean))]
      stages = (teamIds.length ? teamIds : [state.teams[0]?.id]).map((tid) => ({
        id: uid('st'),
        name: state.teams.find((t) => t.id === tid)?.name || 'Review',
        teamId: tid,
      }))
    }
    const form = { ...draft, stages, status: status === 'published' ? 'published' : draft.status }
    const initialValues = Object.fromEntries(form.fields.map((f) => [f.id, initial[f.id] ?? f.defaultValue]))
    actions.saveForm(form, status === 'published' && withData && !existing ? initialValues : null)
    if (status === 'published') patchUi({ page: 'sheet', activeFormId: form.id, builderFormId: null })
    else setDraft(form)
  }

  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-3">
            <h2 className="mr-1 text-sm font-semibold text-gray-900">{existing ? 'Edit form' : 'New form'}</h2>
            <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
              {[
                ['build', 'Build', Hammer],
                ['preview', 'Preview', Eye],
              ].map(([m, label, Icon]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition', mode === m ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50')}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold', draft.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
              {draft.status === 'published' ? 'Published' : 'Draft'}
            </span>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => patchUi({ page: 'forms', builderFormId: null })}>Cancel</Button>
              <Button onClick={() => submit('draft')}>Save draft</Button>
              <Button variant="primary" onClick={() => submit('published')}>
                <Send size={14} /> Publish
              </Button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {mode === 'build' ? (
              <>
                <section className="mb-6">
                  <input className={cx(inputCls, 'text-base font-semibold')} placeholder="Form name, e.g. Purchase Requests" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  <textarea rows={2} className={cx(inputCls, 'mt-3')} placeholder="Describe what this form is for" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
                </section>

                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fields ({draft.fields.length})</h3>
                  <span className="text-xs text-gray-400">Drag to reorder · team controls who can edit</span>
                </div>
                <ul className="space-y-2">
                  {draft.fields.map((f, i) => (
                    <FieldCard
                      key={f.id}
                      field={f}
                      index={i}
                      total={draft.fields.length}
                      teams={state.teams}
                      users={state.users}
                      dragging={dragIdx === i}
                      onChange={(patch) => updateField(f.id, patch)}
                      colorsRows={f.type === 'dropdown' && draft.colorFieldId === f.id}
                      onColorRows={(on) => setDraft((d) => ({ ...d, colorFieldId: on ? f.id : null }))}
                      onRemove={() => setFields(draft.fields.filter((x) => x.id !== f.id))}
                      onMove={(d) => setFields(move(draft.fields, i, i + d))}
                      dragProps={{
                        draggable: true,
                        onDragStart: (e) => {
                          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return e.preventDefault()
                          setDragIdx(i)
                        },
                        onDragOver: (e) => e.preventDefault(),
                        onDrop: () => {
                          if (dragIdx !== null && dragIdx !== i) setFields(move(draft.fields, dragIdx, i))
                          setDragIdx(null)
                        },
                        onDragEnd: () => setDragIdx(null),
                      }}
                    />
                  ))}
                </ul>
                <div className="mt-3 rounded-2xl border-2 border-dashed border-gray-200 p-4">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    <Plus size={12} className="mr-1 inline" />
                    Add a field
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FIELD_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFields([...draft.fields, newField(t.value, state.teams[0]?.id || '')])}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-indigo-300 hover:text-indigo-700"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <section>
                <div className="mb-5 border-b border-gray-100 pb-4">
                  <div className="mb-3 h-1.5 w-16 rounded-full bg-brand-700" />
                  <h2 className="text-xl font-semibold text-gray-900">{draft.name || 'Untitled form'}</h2>
                  {draft.description && <p className="mt-1 text-sm text-gray-500">{draft.description}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {draft.fields.map((f) => (
                    <div key={f.id} className={f.type === 'longtext' ? 'sm:col-span-2' : ''}>
                      {f.type !== 'checkbox' && (
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                          {f.label || 'Untitled field'}
                          {f.required && <span className="text-red-500">*</span>}
                          <span className="ml-auto text-[10px] font-normal text-gray-400">{state.teams.find((t) => t.id === f.teamId)?.name}</span>
                        </label>
                      )}
                      <FieldInput field={f} value={initial[f.id] ?? f.defaultValue} users={state.users} onChange={(v) => setInitial((x) => ({ ...x, [f.id]: v }))} />
                    </div>
                  ))}
                </div>
                {!existing && (
                  <div className="mt-6 rounded-xl bg-indigo-50/60 p-3">
                    <Toggle checked={withData} onChange={setWithData} label="Save with this initial data (creates the first record on publish)" />
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

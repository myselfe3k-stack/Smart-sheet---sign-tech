import { useEffect, useRef, useState } from 'react'
import { Check, Lock, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { canEditField } from '../lib/permissions'
import { displayValue } from '../lib/records'
import { isEmpty } from '../lib/utils'
import { Button, FieldInput } from './ui'

// Editable row at the top of the grid for creating a record in place.
// Fields the current user's team doesn't own are locked and keep their default values.
export default function NewRecordRow({ form, columns, ctx, onSave, onCancel }) {
  const { currentUser } = useStore()
  const [values, setValues] = useState(() =>
    Object.fromEntries(form.fields.map((f) => [f.id, f.type === 'checkbox' ? !!f.defaultValue : f.defaultValue ?? ''])),
  )
  const [tried, setTried] = useState(false)
  const rowRef = useRef(null)
  useEffect(() => {
    rowRef.current?.querySelector('input:not([type=checkbox]):not([disabled]), select:not([disabled])')?.focus({ preventScroll: true })
  }, [])
  const firstStage = form.stages[0]

  const save = () => {
    setTried(true)
    onSave(values)
  }
  const onKeyDown = (e) => {
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') save()
  }

  return (
    <>
      <tr ref={rowRef} className="bg-brand-50 align-middle" onKeyDown={onKeyDown}>
        <td className="border-b border-r border-brand-200 px-2 text-center">
          <button onClick={onCancel} className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-500" aria-label="Cancel new record" title="Cancel (Esc)">
            <X size={14} />
          </button>
        </td>
        <td className="border-b border-r border-brand-200 px-1 text-center">
          <button onClick={save} className="rounded-md bg-brand-700 p-1 text-white hover:bg-brand-800" aria-label="Save new record" title="Save (Enter)">
            <Check size={14} strokeWidth={3} />
          </button>
        </td>
        <td className="border-b border-r border-brand-200" />
        {columns.map((c) => {
          const editable = canEditField(currentUser, c)
          return (
            <td key={c.id} className="border-b border-r border-brand-200 px-2 py-1.5 last:border-r-0">
              {editable ? (
                <FieldInput
                  compact
                  field={c}
                  value={values[c.id]}
                  users={ctx.users}
                  invalid={tried && c.required && c.teamId === firstStage?.teamId && isEmpty(values[c.id])}
                  onChange={(v) => setValues((s) => ({ ...s, [c.id]: v }))}
                />
              ) : (
                <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-gray-400" title="Owned by another team">
                  <Lock size={11} /> {displayValue(ctx, c, values[c.id]) || '—'}
                </span>
              )}
            </td>
          )
        })}
      </tr>
      <tr>
        <td colSpan={columns.length + 3} className="border-b border-brand-200 bg-brand-50/60 px-3 py-2">
          <div className="sticky left-3 flex w-fit items-center gap-3">
            <Button size="sm" variant="primary" onClick={save}>
              <Check size={13} /> Save record
            </Button>
            <Button size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <span className="text-xs text-gray-500">Enter to save · Esc to cancel · locked fields belong to other teams</span>
          </div>
        </td>
      </tr>
    </>
  )
}

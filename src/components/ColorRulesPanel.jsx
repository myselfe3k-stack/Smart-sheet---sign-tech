import { useState } from 'react'
import { Palette, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { suggestOptionColor } from '../data/models'
import { isAdmin } from '../lib/permissions'
import { recordTitle } from '../lib/records'
import { getRowColor } from '../lib/colorRules'
import { cx } from '../lib/utils'
import { Button, SwatchPicker, inputCls } from './ui'

// One dropdown field decides the color of the whole row; each of its options carries a color.
export default function ColorRulesPanel({ form, records, onClose }) {
  const { currentUser, actions } = useStore()
  const admin = isAdmin(currentUser)
  const [fields, setFields] = useState(() => structuredClone(form.fields))
  const [colorFieldId, setColorFieldId] = useState(form.colorFieldId || '')
  const [defaultColor, setDefaultColor] = useState(form.defaultColor || '#FFFFFF')

  const dropdowns = fields.filter((f) => f.type === 'dropdown')
  const field = dropdowns.find((f) => f.id === colorFieldId)
  const draftForm = { ...form, fields, colorFieldId: colorFieldId || null, defaultColor }

  const setOptionColor = (option, color) =>
    setFields((fs) => fs.map((f) => (f.id === field.id ? { ...f, optionColors: { ...f.optionColors, [option]: color } } : f)))

  const save = () => {
    actions.patchForm(form.id, { fields, colorFieldId: colorFieldId || null, defaultColor }, field ? `Rows now colored by "${field.label}"` : 'Turned off row coloring')
    actions.toast('Row colors saved', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/20" onMouseDown={onClose}>
      <div className="anim-drawer flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Palette size={16} />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Row colors</h2>
            <p className="text-xs text-gray-500">Pick one dropdown field. Each of its values paints the entire row.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!admin && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Only admins can change row colors.</p>}

          <section>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Color rows by</label>
            <select disabled={!admin} className={inputCls} value={colorFieldId} onChange={(e) => setColorFieldId(e.target.value)}>
              <option value="">No row coloring</option>
              {dropdowns.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {dropdowns.length === 0 && <p className="mt-1.5 text-xs text-gray-400">Add a Dropdown field in the form builder to color rows.</p>}
          </section>

          {field && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{field.label} values</h3>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                {field.options.map((o, i) => {
                  const color = field.optionColors?.[o] || suggestOptionColor(o, i)
                  return (
                    <li key={o} className="flex items-center gap-3 px-3 py-2" style={{ background: color }}>
                      <span className="flex-1 text-sm font-medium text-gray-800">{o}</span>
                      {admin && <SwatchPicker value={color} onChange={(c) => setOptionColor(o, c)} label={`Color for ${o}`} />}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
            <span className="text-xs font-semibold text-gray-600">Row color when empty / no match</span>
            {admin ? <SwatchPicker value={defaultColor} onChange={setDefaultColor} label="Default row color" /> : <span className="h-6 w-6 rounded-md border" style={{ background: defaultColor }} />}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Live preview</h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-[13px]">
                <tbody>
                  {records.slice(0, 8).map((r) => (
                    <tr key={r.id} style={{ background: getRowColor(draftForm, r) || '#fff' }} className="border-b border-gray-200/70 last:border-0">
                      <td className="px-3 py-2 font-medium text-gray-800">{recordTitle(form, r)}</td>
                      <td className={cx('px-3 py-2 text-right text-gray-600')}>{field ? r.values[field.id] || '—' : ''}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-400">Add records to preview colors</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!admin} onClick={save}>
            Save colors
          </Button>
        </div>
      </div>
    </div>
  )
}

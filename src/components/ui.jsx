import { useEffect, useId, useRef, useState } from 'react'
import { ROW_COLORS } from '../data/models'
import { Lock, X } from 'lucide-react'
import { cx } from '../lib/utils'

// Generic profile picture: blue gradient disc with a soft grey head-and-shoulders silhouette.
export function Avatar({ user, size = 32, ring = false, className = '' }) {
  const id = useId().replace(/:/g, '')
  if (!user) return null
  return (
    <span
      title={user.name}
      role="img"
      aria-label={user.name}
      className={cx('inline-flex shrink-0 overflow-hidden rounded-full select-none', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-bg`} cx="30%" cy="25%" r="85%">
            <stop offset="0%" stopColor="#5BC8F0" />
            <stop offset="55%" stopColor="#3A9BE0" />
            <stop offset="100%" stopColor="#2F6FCF" />
          </radialGradient>
          <radialGradient id={`${id}-fg`} cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#D4D7DC" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill={`url(#${id}-bg)`} />
        <circle cx="32" cy="23" r="11.5" fill={`url(#${id}-fg)`} />
        <ellipse cx="32" cy="62" rx="22" ry="20" fill={`url(#${id}-fg)`} />
      </svg>
    </span>
  )
}

const BTN = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  ai: 'bg-ai text-white shadow-sm hover:opacity-95',
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        BTN[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Closes when clicking outside its container.
export function Popover({ open, onClose, children, className = '', align = 'left' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-popover-trigger]')) onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cx(
        'anim-fade absolute top-full z-40 mt-2 rounded-xl border border-gray-100 bg-white p-3 shadow-xl shadow-gray-900/10',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className={cx('anim-rise flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600', disabled && 'opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand-700' : 'bg-gray-300')}
      >
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      {label}
    </label>
  )
}

export const STATUS_STYLES = {
  Complete: 'bg-emerald-100 text-emerald-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Pending: 'bg-orange-100 text-orange-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Rejected: 'bg-red-100 text-red-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
  'Not Started': 'bg-gray-100 text-gray-700',
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-slate-100 text-slate-700',
}

// `color` (an option color) wins over the built-in status styles; text stays dark for readability.
export function Pill({ value, color, className = '' }) {
  if (!value) return null
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-black/10',
        color ? 'text-gray-800' : STATUS_STYLES[value] || 'bg-white/70 text-gray-700',
        className,
      )}
      style={color ? { background: color } : undefined}
    >
      {value}
    </span>
  )
}

export function TeamPill({ team }) {
  if (!team) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-black/5">
      <span className="h-2 w-2 rounded-full" style={{ background: team.color }} />
      {team.name}
    </span>
  )
}

export const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

// Renders an editor for any field type. Read-only fields are greyed with a lock icon.
// `compact` renders a slimmer single-line control for inline grid editing; `invalid` outlines it red.
export function FieldInput({ field, value, onChange, users = [], readOnly = false, compact = false, invalid = false }) {
  const common = {
    disabled: readOnly,
    id: `fld_${field.id}`,
    className: cx(inputCls, compact && '!py-1 !px-2 min-w-[150px] !text-[13px]', invalid && '!border-red-400 !ring-2 !ring-red-100'),
  }
  let control
  switch (field.type) {
    case 'longtext':
      control = compact ? (
        <input type="text" {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <textarea rows={3} {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )
      break
    case 'number':
      control = (
        <input type="number" {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      )
      break
    case 'date':
      control = <input type="date" {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'dropdown':
      control = (
        <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )
      break
    case 'checkbox':
      control = (
        <label className={cx('flex items-center gap-2 text-sm', readOnly && 'text-gray-400')}>
          <input type="checkbox" disabled={readOnly} checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
          {field.label}
        </label>
      )
      break
    case 'user':
      control = (
        <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )
      break
    default:
      control = (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          {...common}
          value={value ?? ''}
          placeholder={field.type === 'url' ? 'https://' : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
  return (
    <div className="relative">
      {control}
      {readOnly && field.type !== 'checkbox' && (
        <Lock size={13} className={cx('pointer-events-none absolute text-gray-400', compact ? 'top-2' : 'top-2.5', ['dropdown', 'user', 'date'].includes(field.type) ? 'right-9' : 'right-2.5')} />
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-gray-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Small swatch button that opens a palette of row-safe light colors.
export function SwatchPicker({ value, onChange, label = 'Pick color' }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        data-popover-trigger
        title={label}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="h-6 w-6 rounded-md border-2 border-white shadow ring-1 ring-gray-400/60 transition hover:scale-110"
        style={{ background: value || '#FFFFFF' }}
      />
      <Popover open={open} onClose={() => setOpen(false)} className="!mt-1 w-[188px] !p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {ROW_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={c.name}
              onClick={() => {
                onChange(c.value)
                setOpen(false)
              }}
              className={cx('h-7 w-7 rounded-md border', value === c.value ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:scale-110')}
              style={{ background: c.value }}
            />
          ))}
        </div>
      </Popover>
    </span>
  )
}

// Solid document icon; table lines take `lineColor`.
export const SheetIcon = ({ color, lineColor = 'white', size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill={color} />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" fill={lineColor} fillOpacity="0.35" />
    <path d="M8 13h2M14 13h2M8 17h2M14 17h2" stroke={lineColor} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

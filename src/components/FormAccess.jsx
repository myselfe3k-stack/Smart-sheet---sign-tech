import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { Avatar, Popover } from './ui'

// People with access to a form: admins plus members of the departments on its workflow stages.
export const formAccessUsers = (form, users) => {
  const teamIds = form.stages.map((s) => s.teamId)
  return users.filter((u) => u.role === 'admin' || teamIds.includes(u.teamId))
}

export default function FormAccess({ form }) {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const people = formAccessUsers(form, state.users)
  const visible = people.slice(0, 4)
  const extra = people.length - visible.length
  if (!people.length) return null

  return (
    <div className="relative">
      <button
        data-popover-trigger
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-gray-100"
        aria-label={`${people.length} people have access to this form`}
        title="See who has access"
      >
        <span className="flex -space-x-2">
          {visible.map((u) => (
            <Avatar key={u.id} user={u} size={26} ring />
          ))}
          {extra > 0 && (
            <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-600 ring-2 ring-white">
              +{extra}
            </span>
          )}
        </span>
        <span className="hidden text-xs font-medium text-gray-500 lg:inline">have access</span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="right" className="w-72">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {people.length} people have access
        </p>
        <ul className="scroll-thin max-h-72 space-y-0.5 overflow-y-auto">
          {people.map((u) => {
            const team = state.teams.find((t) => t.id === u.teamId)
            return (
              <li key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <Avatar user={u} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-800">{u.name}</span>
                  <span className="block text-xs text-gray-400">{u.role === 'admin' ? 'Admin · all access' : team?.name}</span>
                </span>
                {u.role === 'manager' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Manager</span>}
              </li>
            )
          })}
        </ul>
      </Popover>
    </div>
  )
}

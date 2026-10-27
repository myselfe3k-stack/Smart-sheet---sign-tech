import { useState } from 'react'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { ROLES, TEAM_COLORS } from '../data/models'
import { isAdmin } from '../lib/permissions'
import { uid } from '../lib/utils'
import { Avatar, Button, Modal, inputCls } from './ui'

export default function UsersTeams() {
  const { state, currentUser, actions } = useStore()
  const admin = isAdmin(currentUser)
  const [team, setTeam] = useState(null)
  const [user, setUser] = useState(null)

  const saveTeam = () => {
    if (!team.name.trim()) return actions.toast('Team name is required', 'error')
    actions.saveTeam(team)
    setTeam(null)
  }
  const saveUser = () => {
    if (!user.name.trim() || !user.email.trim()) return actions.toast('Name and email are required', 'error')
    actions.saveUser(user)
    setUser(null)
  }

  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        {!admin && (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Lock size={15} /> View only — switch to the Admin user to manage teams and users.
          </p>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Teams</h2>
              <p className="text-xs text-gray-400">Teams own form fields and workflow stages</p>
            </div>
            {admin && (
              <Button size="sm" variant="primary" onClick={() => setTeam({ id: uid('team'), name: '', color: TEAM_COLORS[state.teams.length % TEAM_COLORS.length] })}>
                <Plus size={14} /> Add team
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.teams.map((t) => {
              const members = state.users.filter((u) => u.teamId === t.id)
              return (
                <div key={t.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                    <span className="flex-1 font-medium text-gray-800">{t.name}</span>
                    {admin && (
                      <button onClick={() => setTeam({ ...t })} className="rounded p-1 text-gray-400 hover:text-indigo-600" aria-label={`Edit ${t.name}`}>
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center -space-x-1.5">
                    {members.map((m) => (
                      <Avatar key={m.id} user={m} size={26} ring />
                    ))}
                    <span className="pl-3 text-xs text-gray-400">{members.length} member{members.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Users</h2>
              <p className="text-xs text-gray-400">Assign people to teams and roles</p>
            </div>
            {admin && (
              <Button size="sm" variant="primary" onClick={() => setUser({ id: uid('u'), name: '', email: '', teamId: state.teams[0]?.id || null, role: 'member', color: TEAM_COLORS[state.users.length % TEAM_COLORS.length] })}>
                <Plus size={14} /> Add user
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Team</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {state.users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 font-medium text-gray-800">
                        <Avatar user={u} size={28} /> {u.name}
                        {u.id === currentUser.id && <span className="rounded-full bg-indigo-50 px-1.5 text-[10px] font-semibold text-indigo-600">You</span>}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-500">{u.email}</td>
                    <td className="py-2.5 pr-3">
                      <select disabled={!admin} className={`${inputCls} !w-40 !py-1`} value={u.teamId || ''} onChange={(e) => actions.saveUser({ ...u, teamId: e.target.value || null })}>
                        <option value="">No team</option>
                        {state.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select disabled={!admin} className={`${inputCls} !w-32 !py-1`} value={u.role} onChange={(e) => actions.saveUser({ ...u, role: e.target.value })}>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 text-right">
                      {admin && (
                        <span className="flex justify-end gap-1">
                          <button onClick={() => setUser({ ...u })} className="rounded p-1 text-gray-400 hover:text-indigo-600" aria-label={`Edit ${u.name}`}>
                            <Pencil size={14} />
                          </button>
                          <button disabled={u.id === currentUser.id} onClick={() => actions.deleteUser(u.id)} className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30" aria-label={`Delete ${u.name}`}>
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal open={!!team} onClose={() => setTeam(null)} title={state.teams.some((t) => t.id === team?.id) ? 'Edit team' : 'New team'} footer={<><Button onClick={() => setTeam(null)}>Cancel</Button><Button variant="primary" onClick={saveTeam}>Save team</Button></>}>
        {team && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Name
              <input autoFocus className={`${inputCls} mt-1`} value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
            </label>
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Color</p>
              <div className="flex gap-2">
                {TEAM_COLORS.map((c) => (
                  <button key={c} onClick={() => setTeam({ ...team, color: c })} className={`h-7 w-7 rounded-full ${team.color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!user} onClose={() => setUser(null)} title={state.users.some((u) => u.id === user?.id) ? 'Edit user' : 'New user'} footer={<><Button onClick={() => setUser(null)}>Cancel</Button><Button variant="primary" onClick={saveUser}>Save user</Button></>}>
        {user && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-gray-600">
              Full name
              <input autoFocus className={`${inputCls} mt-1`} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Email
              <input type="email" className={`${inputCls} mt-1`} value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Team
              <select className={`${inputCls} mt-1`} value={user.teamId || ''} onChange={(e) => setUser({ ...user, teamId: e.target.value || null })}>
                <option value="">No team</option>
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Role
              <select className={`${inputCls} mt-1`} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </Modal>
    </div>
  )
}

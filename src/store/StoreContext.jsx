import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react'
import { initialState, missingRequiredForStage, partitionChanges, reducer } from './reducer'
import { canApprove, canCompleteStage, canCreateRecord, canEditField, canReject, canReturn } from '../lib/permissions'
import { uid } from '../lib/utils'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, tone = 'info') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const [ui, setUi] = useState({
    page: 'sheet',
    activeFormId: 'form_leads',
    drawer: null, // recordId | 'new' | null
    newRow: false, // true while an inline new-record row is open in the grid
    builderFormId: null,
    aiOpen: false, // the AI chat opens only when the user clicks the AI button
    history: [], // previous { page, activeFormId, builderFormId } entries for the Back button
  })
  // Moving to another page (or another sheet) records where we were, so goBack can return there.
  // Pass { replace: true } for redirects that shouldn't be a history step.
  const patchUi = useCallback(
    (patch, { replace = false } = {}) =>
      setUi((u) => {
        const nextPage = patch.page ?? u.page
        const nextForm = patch.activeFormId ?? u.activeFormId
        const moved = nextPage !== u.page || (nextPage === 'sheet' && nextForm !== u.activeFormId)
        const history = moved && !replace
          ? [...u.history, { page: u.page, activeFormId: u.activeFormId, builderFormId: u.builderFormId }].slice(-30)
          : u.history
        return { ...u, ...patch, history }
      }),
    [],
  )
  const goBack = useCallback(
    () =>
      setUi((u) => {
        const prev = u.history[u.history.length - 1]
        const base = { ...u, drawer: null, newRow: false }
        return prev ? { ...base, ...prev, history: u.history.slice(0, -1) } : { ...base, page: 'forms' }
      }),
    [],
  )

  const currentUser = state.users.find((u) => u.id === state.currentUserId) || state.users[0]

  const actions = useMemo(() => {
    const me = () => stateRef.current.users.find((u) => u.id === stateRef.current.currentUserId)
    const lookup = (recordId) => {
      const s = stateRef.current
      const record = s.records.find((r) => r.id === recordId)
      return { record, form: record && s.forms.find((f) => f.id === record.formId) }
    }
    const run = (type, payload) => dispatch({ type, payload: { userId: stateRef.current.currentUserId, ...payload } })

    return {
      setCurrentUser: (userId) => dispatch({ type: 'SET_CURRENT_USER', payload: { userId } }),

      createRecord(formId, values) {
        const form = stateRef.current.forms.find((f) => f.id === formId)
        if (!canCreateRecord(me(), form)) {
          toast(`Only the ${form.stages[0]?.name || 'first stage'} team can create records`, 'error')
          return null
        }
        // Only nag about required first-stage fields the current user is actually allowed to fill.
        const missing = form.fields.filter(
          (f) =>
            f.required &&
            f.teamId === form.stages[0]?.teamId &&
            canEditField(me(), f) &&
            (values[f.id] === '' || values[f.id] == null),
        )
        if (missing.length) {
          toast(`Please fill: ${missing.map((f) => f.label).join(', ')}`, 'error')
          return null
        }
        const id = uid('rec')
        run('CREATE_RECORD', { formId, values, id })
        toast('Record created', 'success')
        return id
      },

      // silent: skip the success toast (inline grid edits save constantly).
      updateRecord(recordId, changes, { silent = false } = {}) {
        const { form } = lookup(recordId)
        const { blocked } = partitionChanges(form, me(), changes)
        if (blocked.length) toast(`No permission to edit: ${blocked.map((f) => f.label).join(', ')}`, 'error')
        run('UPDATE_RECORD', { recordId, changes })
        if (!silent && blocked.length < Object.keys(changes).length) toast('Changes saved', 'success')
      },

      // pendingValues: unsaved edits dispatched just before this call (reducer applies them first).
      completeStage(recordId, pendingValues = {}) {
        const { record, form } = lookup(recordId)
        if (!canCompleteStage(me(), form, record)) return toast('Only the active team can complete this stage', 'error')
        const merged = { ...record, values: { ...record.values, ...partitionChanges(form, me(), pendingValues).allowed } }
        const missing = missingRequiredForStage(form, merged, form.stages[record.stageIndex])
        if (missing.length) return toast(`Required: ${missing.map((f) => f.label).join(', ')}`, 'error')
        run('COMPLETE_STAGE', { recordId })
        toast(`Moved to ${form.stages[record.stageIndex + 1]?.name}`, 'success')
      },

      returnStage(recordId, note) {
        const { record, form } = lookup(recordId)
        if (!canReturn(me(), form, record)) return toast('You cannot return this record', 'error')
        run('RETURN_STAGE', { recordId, note })
        toast('Record returned', 'info')
      },

      approve(recordId, note) {
        const { record, form } = lookup(recordId)
        if (!canApprove(me(), form, record)) return toast('Only managers can approve at the final stage', 'error')
        run('APPROVE', { recordId, note })
        toast('Record approved', 'success')
      },

      reject(recordId, note) {
        const { record } = lookup(recordId)
        if (!canReject(me(), record)) return toast('Only managers can reject', 'error')
        run('REJECT', { recordId, note })
        toast('Record rejected', 'info')
      },

      saveForm(form, initialValues) {
        run('SAVE_FORM', { form })
        if (initialValues) run('CREATE_RECORD', { formId: form.id, values: initialValues, id: uid('rec') })
        toast(form.status === 'published' ? 'Form published' : 'Draft saved', 'success')
      },

      patchForm: (formId, patch, message) => run('PATCH_FORM', { formId, patch, message }),
      deleteForm: (formId) => run('DELETE_FORM', { formId }),
      saveTeam: (team) => run('SAVE_TEAM', { team }),
      saveUser: (user) => run('SAVE_USER', { user }),
      deleteUser: (userId) => run('DELETE_USER', { userId }),
      markRead: (ids) => run('MARK_READ', { ids }),
      setViewConfig: (formId, config) => run('SET_VIEW_CONFIG', { formId, config }),
      toast,
    }
  }, [toast])

  const value = useMemo(
    () => ({ state, currentUser, actions, ui, patchUi, goBack, toasts }),
    [state, currentUser, actions, ui, patchUi, goBack, toasts],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)

// Notifications visible to a user: their team's, or everything for admins.
export const visibleNotifications = (state, user) =>
  state.notifications.filter((n) => user.role === 'admin' || n.teamId === user.teamId)

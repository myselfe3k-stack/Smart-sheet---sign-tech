import { isEmpty } from './utils'

// The form's color field must be a dropdown; its option colors paint the whole row.
export const colorField = (form) =>
  form.fields.find((f) => f.id === form.colorFieldId && f.type === 'dropdown') || null

export const optionColor = (field, value) => (isEmpty(value) ? null : field?.optionColors?.[value] || null)

// Row color = the color of the selected option in the color field, else the form's default.
export const getRowColor = (form, record) => {
  const field = colorField(form)
  const color = field && optionColor(field, record.values[field.id])
  return color || form.defaultColor || null
}

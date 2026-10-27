// Shared data model definitions. Shapes are plain JSON so they can map 1:1 to API payloads later.
//
// Team        { id, name, color }
// User        { id, name, email, teamId|null, role: 'admin'|'manager'|'member', color }
// Form        { id, name, description, status: 'draft'|'published', fields: Field[],
//               stages: Stage[], colorFieldId|null, defaultColor, audit: AuditEntry[], createdAt, updatedAt }
//               colorFieldId names the one dropdown field whose option colors paint whole rows.
// Field       { id, label, type, required, defaultValue, options: string[], optionColors: { [option]: hex },
//               teamId|null }
// Stage       { id, name, teamId }
// Record      { id, formId, values: { [fieldId]: any }, stageIndex, workflowStatus: 'active'|'approved'|'rejected',
//               createdBy, createdAt, updatedAt, history: AuditEntry[] }
// AuditEntry  { id, at, userId, type, message, fieldId?, from?, to? }
// Notification{ id, teamId, formId, recordId, message, at, read }

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'longtext', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'user', label: 'User' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
]

export const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Pending', 'On Hold', 'Complete', 'Rejected']
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

export const typeHasOptions = (type) => type === 'dropdown'

// Dropdowns start empty; the admin adds every option explicitly.
export const defaultOptionsFor = () => []

export const ROW_COLORS = [
  { name: 'Light green', value: '#DCFCE7' },
  { name: 'Light orange', value: '#FFEDD5' },
  { name: 'Light blue', value: '#DBEAFE' },
  { name: 'Light red', value: '#FEE2E2' },
  { name: 'Light yellow', value: '#FEF9C3' },
  { name: 'Light grey', value: '#F1F5F9' },
  { name: 'Light purple', value: '#EDE9FE' },
  { name: 'Light teal', value: '#CCFBF1' },
  { name: 'White', value: '#FFFFFF' },
]

// Suggested colors for well-known option names; anything else cycles through ROW_COLORS.
export const SUGGESTED_OPTION_COLORS = {
  Complete: '#DCFCE7',
  Approved: '#DCFCE7',
  Done: '#DCFCE7',
  Pending: '#FFEDD5',
  'In Progress': '#DBEAFE',
  Rejected: '#FEE2E2',
  Blocked: '#FEE2E2',
  'On Hold': '#FEF9C3',
  'Not Started': '#F1F5F9',
  Critical: '#FEE2E2',
  Open: '#FFEDD5',
  Resolved: '#DCFCE7',
  Applied: '#F1F5F9',
  Interview: '#DBEAFE',
  Offer: '#EDE9FE',
  Hired: '#DCFCE7',
  High: '#FEE2E2',
  Medium: '#FEF9C3',
  Low: '#F1F5F9',
}

export const suggestOptionColor = (label, index = 0) =>
  SUGGESTED_OPTION_COLORS[label] || ROW_COLORS[index % (ROW_COLORS.length - 1)].value

export const optionColorsFor = (options) => Object.fromEntries(options.map((o, i) => [o, suggestOptionColor(o, i)]))

// Virtual columns computed from workflow state rather than stored values.
export const VIRTUAL_FIELDS = [
  { id: '__status', label: 'Status', type: 'dropdown', options: [...STATUS_OPTIONS], virtual: true },
  { id: '__stage', label: 'Current Stage', type: 'dropdown', virtual: true },
  { id: '__team', label: 'Assigned Team', type: 'dropdown', virtual: true },
]

export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
]

export const TEAM_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444']

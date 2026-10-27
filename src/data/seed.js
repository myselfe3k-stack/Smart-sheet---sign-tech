import { STATUS_OPTIONS, PRIORITY_OPTIONS, optionColorsFor } from './models'
import { addDays } from '../lib/utils'

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

export const seedTeams = [
  { id: 'sales', name: 'Sales', color: '#6366F1' },
  { id: 'it', name: 'IT', color: '#0EA5E9' },
  { id: 'dev', name: 'Development', color: '#10B981' },
  { id: 'mgmt', name: 'Management', color: '#F59E0B' },
]

export const seedUsers = [
  { id: 'u_admin', name: 'Alex Morgan', email: 'alex@flowsheet.io', teamId: null, role: 'admin', color: '#0D47A1' },
  { id: 'u_sales', name: 'Sam Rivera', email: 'sam@flowsheet.io', teamId: 'sales', role: 'member', color: '#6366F1' },
  { id: 'u_it', name: 'Priya Shah', email: 'priya@flowsheet.io', teamId: 'it', role: 'member', color: '#0EA5E9' },
  { id: 'u_dev', name: 'Diego Alvarez', email: 'diego@flowsheet.io', teamId: 'dev', role: 'member', color: '#10B981' },
  { id: 'u_mgr', name: 'Morgan Lee', email: 'morgan@flowsheet.io', teamId: 'mgmt', role: 'manager', color: '#F59E0B' },
  { id: 'u_jk', name: 'Jordan Kim', email: 'jordan@flowsheet.io', teamId: 'sales', role: 'member', color: '#EC4899' },
  { id: 'u_tb', name: 'Taylor Brooks', email: 'taylor@flowsheet.io', teamId: 'it', role: 'member', color: '#8B5CF6' },
  { id: 'u_cn', name: 'Casey Nguyen', email: 'casey@flowsheet.io', teamId: 'dev', role: 'member', color: '#14B8A6' },
]

const F = {
  lead: 'f_lead',
  company: 'f_company',
  email: 'f_email',
  priority: 'f_priority',
  due: 'f_due',
  tech: 'f_tech',
  itStatus: 'f_itstatus',
  devNotes: 'f_devnotes',
  impl: 'f_impl',
  approval: 'f_approval',
}

const field = (id, label, type, teamId, extra = {}) => ({
  id,
  label,
  type,
  teamId,
  required: false,
  defaultValue: '',
  options: [],
  description: '',
  ...extra,
  optionColors: optionColorsFor(extra.options || []),
})

const leadForm = {
  id: 'form_leads',
  name: 'Lead Management',
  description: 'Track inbound leads from first contact through technical review, delivery and sign-off.',
  status: 'published',
  createdAt: hoursAgo(24 * 30),
  updatedAt: hoursAgo(24 * 2),
  fields: [
    field(F.lead, 'Lead Name', 'text', 'sales', { required: true }),
    field(F.company, 'Company Name', 'text', 'sales', { required: true }),
    field(F.email, 'Contact Email', 'email', 'sales', { required: true }),
    field(F.priority, 'Priority', 'dropdown', 'sales', { options: [...PRIORITY_OPTIONS], defaultValue: 'Medium' }),
    field(F.due, 'Due Date', 'date', 'sales'),
    field(F.tech, 'Technical Assessment', 'longtext', 'it', { required: true, description: "IT's notes on the lead's infrastructure, SSO and data-residency needs, written during IT Review." }),
    field(F.itStatus, 'IT Status', 'dropdown', 'it', { required: true, options: [...STATUS_OPTIONS], defaultValue: 'Not Started', description: 'Progress of the IT security and infrastructure review. Complete means IT has signed off and the lead can move to Development.' }),
    field(F.devNotes, 'Development Notes', 'longtext', 'dev'),
    field(F.impl, 'Implementation Status', 'dropdown', 'dev', { required: true, options: [...STATUS_OPTIONS], defaultValue: 'Not Started' }),
    field(F.approval, 'Final Approval', 'dropdown', 'mgmt', { options: ['Pending', 'Approved', 'Rejected'], defaultValue: 'Pending', description: "Management's go/no-go decision on the deal. Set automatically when a manager approves or rejects the record." }),
  ],
  stages: [
    { id: 'st_sales', name: 'Sales', teamId: 'sales' },
    { id: 'st_it', name: 'IT Review', teamId: 'it' },
    { id: 'st_dev', name: 'Development', teamId: 'dev' },
    { id: 'st_mgmt', name: 'Management', teamId: 'mgmt' },
  ],
  // IT Status drives row colors, e.g. Complete → light green, On Hold → light yellow.
  colorFieldId: F.itStatus,
  defaultColor: '#FFFFFF',
  audit: [
    { id: 'fa_1', at: hoursAgo(24 * 30), userId: 'u_admin', type: 'form', message: 'Created form "Lead Management"' },
    { id: 'fa_2', at: hoursAgo(24 * 2), userId: 'u_admin', type: 'form', message: 'Marked "IT Status" as required' },
  ],
}

// [lead, company, priority, dueOffsetDays, stageIndex, workflowStatus, itStatus, implStatus, approval, ageHours]
const LEADS = [
  ['Olivia Bennett', 'Northwind Traders', 'High', 6, 0, 'active', 'Not Started', 'Not Started', 'Pending', 10],
  ['Marcus Hale', 'Contoso Ltd', 'Medium', 12, 0, 'active', 'Not Started', 'Not Started', 'Pending', 20],
  ['Hannah Cole', 'Fabrikam Inc', 'High', -3, 0, 'active', 'Not Started', 'Not Started', 'Pending', 90],
  ['Ethan Park', 'Adventure Works', 'High', 2, 1, 'active', 'In Progress', 'Not Started', 'Pending', 60],
  ['Sophia Turner', 'Tailspin Toys', 'Medium', -2, 1, 'active', 'Pending', 'Not Started', 'Pending', 130],
  ['Liam Foster', 'Wide World Importers', 'Low', 15, 1, 'active', 'On Hold', 'Not Started', 'Pending', 75],
  ['Ava Mitchell', 'Litware Inc', 'Medium', 9, 1, 'active', 'Not Started', 'Not Started', 'Pending', 30],
  ['Noah Price', 'Proseware', 'High', -5, 1, 'active', 'In Progress', 'Not Started', 'Pending', 160],
  ['Mia Sullivan', 'Coho Winery', 'Medium', 4, 2, 'active', 'Complete', 'In Progress', 'Pending', 200],
  ['Lucas Grant', 'Lucerne Publishing', 'Low', 20, 2, 'active', 'Complete', 'Pending', 'Pending', 220],
  ['Isabella Ross', 'Margie’s Travel', 'High', -1, 2, 'active', 'Complete', 'Not Started', 'Pending', 180],
  ['James Ward', 'Blue Yonder Airlines', 'Medium', 3, 3, 'active', 'Complete', 'Complete', 'Pending', 260],
  ['Charlotte Hayes', 'Trey Research', 'Low', 7, 3, 'active', 'Complete', 'Complete', 'Pending', 300],
  ['Benjamin Reed', 'Alpine Ski House', 'Medium', -10, 4, 'approved', 'Complete', 'Complete', 'Approved', 400],
  ['Amelia Brooks', 'Graphic Design Institute', 'High', -4, 1, 'rejected', 'Rejected', 'Not Started', 'Rejected', 340],
]

const STAGE_USERS = ['u_sales', 'u_it', 'u_dev', 'u_mgr']
const STAGE_NAMES = leadForm.stages.map((s) => s.name)

const buildRecord = (row, i) => {
  const [lead, company, priority, due, stageIndex, workflowStatus, itStatus, impl, approval, age] = row
  const reachedIt = stageIndex >= 1 || workflowStatus !== 'active'
  const reachedDev = stageIndex >= 2
  const createdAt = hoursAgo(age)
  const history = [
    { id: `h_${i}_0`, at: createdAt, userId: 'u_sales', type: 'create', message: 'Created record' },
  ]
  const lastStage = Math.min(stageIndex, 3)
  for (let s = 1; s <= lastStage; s++) {
    history.push({
      id: `h_${i}_s${s}`,
      at: hoursAgo(age - (age / (lastStage + 1)) * s),
      userId: STAGE_USERS[s - 1],
      type: 'stage',
      message: `Completed ${STAGE_NAMES[s - 1]} → moved to ${STAGE_NAMES[s]}`,
    })
  }
  if (workflowStatus === 'approved')
    history.push({ id: `h_${i}_a`, at: hoursAgo(age / 6), userId: 'u_mgr', type: 'approval', message: 'Approved record' })
  if (workflowStatus === 'rejected')
    history.push({ id: `h_${i}_r`, at: hoursAgo(age / 6), userId: 'u_mgr', type: 'approval', message: 'Rejected record' })

  return {
    id: `rec_${i + 1}`,
    formId: leadForm.id,
    stageIndex,
    workflowStatus,
    createdBy: 'u_sales',
    createdAt,
    updatedAt: history[history.length - 1].at,
    values: {
      [F.lead]: lead,
      [F.company]: company,
      [F.email]: `${lead.split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      [F.priority]: priority,
      [F.due]: addDays(due),
      [F.tech]: reachedIt && itStatus !== 'Not Started' ? 'Reviewed infrastructure, SSO and data residency needs.' : '',
      [F.itStatus]: itStatus,
      [F.devNotes]: reachedDev ? 'Scoped integration work; sprint planned.' : '',
      [F.impl]: impl,
      [F.approval]: approval,
    },
    history,
  }
}

const E = { id: 'e_id', name: 'e_name', dept: 'e_dept', status: 'e_status' }

const employeeForm = {
  id: 'form_employees',
  name: 'Difinity Employee Sheet',
  description: 'Who is on a project and who is on the bench, by department.',
  status: 'published',
  createdAt: hoursAgo(24 * 10),
  updatedAt: hoursAgo(24 * 10),
  fields: [
    field(E.id, 'ID', 'number', 'mgmt', { required: true }),
    field(E.name, 'Name', 'text', 'mgmt', { required: true }),
    field(E.dept, 'Department', 'dropdown', 'mgmt', { required: true, options: ['Sales', 'IT', 'Development', 'Management'] }),
    {
      ...field(E.status, 'Status', 'dropdown', 'mgmt', { required: true, options: ['Benched', 'In Project'] }),
      optionColors: { Benched: '#FFEDD5', 'In Project': '#DCFCE7' },
    },
  ],
  stages: [{ id: 'st_emp_mgmt', name: 'Management', teamId: 'mgmt' }],
  colorFieldId: E.status,
  defaultColor: '#FFFFFF',
  audit: [{ id: 'fa_e1', at: hoursAgo(24 * 10), userId: 'u_admin', type: 'form', message: 'Created form "Difinity Employee Sheet"' }],
}

// [id, name, department, status]
const EMPLOYEES = [
  [1001, 'Aisha Khan', 'Development', 'In Project'],
  [1002, 'Rahul Menon', 'IT', 'Benched'],
  [1003, 'Emily Carter', 'Sales', 'In Project'],
  [1004, 'Daniel Wu', 'Development', 'Benched'],
  [1005, 'Fatima Noor', 'Management', 'In Project'],
  [1006, 'Arjun Nair', 'IT', 'In Project'],
]

const employeeRecords = EMPLOYEES.map(([id, name, dept, status], i) => {
  const createdAt = hoursAgo(24 * 9 - i * 6)
  return {
    id: `emp_${id}`,
    formId: employeeForm.id,
    stageIndex: 0,
    workflowStatus: 'active',
    createdBy: 'u_admin',
    createdAt,
    updatedAt: createdAt,
    values: { [E.id]: id, [E.name]: name, [E.dept]: dept, [E.status]: status },
    history: [{ id: `h_emp_${id}`, at: createdAt, userId: 'u_admin', type: 'create', message: 'Created record' }],
  }
})

// Compact spec for extra sample forms. Field tuple: [key, label, type, teamId, extra]; each row lists
// values in field order (a number in a date column means "days from today"). Records are spread across stages.
const quickForm = ({ key, name, description, ageDays, stages, fields, colorBy, rows }) => {
  const fid = (k) => `${key}_${k}`
  const form = {
    id: `form_${key}`,
    name,
    description,
    status: 'published',
    createdAt: hoursAgo(24 * ageDays),
    updatedAt: hoursAgo(24 * Math.max(1, ageDays - 3)),
    fields: fields.map(([k, label, type, teamId, extra = {}]) => field(fid(k), label, type, teamId, extra)),
    stages: stages.map(([stageName, teamId], i) => ({ id: `st_${key}_${i}`, name: stageName, teamId })),
    colorFieldId: colorBy ? fid(colorBy) : null,
    defaultColor: '#FFFFFF',
    audit: [{ id: `fa_${key}`, at: hoursAgo(24 * ageDays), userId: 'u_admin', type: 'form', message: `Created form "${name}"` }],
  }
  const records = rows.map((row, i) => {
    const createdAt = hoursAgo(24 * ageDays - (i + 1) * 9)
    const values = Object.fromEntries(
      form.fields.map((f, j) => [f.id, f.type === 'date' && typeof row[j] === 'number' ? addDays(row[j]) : row[j] ?? '']),
    )
    return {
      id: `rec_${key}_${i + 1}`,
      formId: form.id,
      stageIndex: i % form.stages.length,
      workflowStatus: 'active',
      createdBy: 'u_admin',
      createdAt,
      updatedAt: createdAt,
      values,
      history: [{ id: `h_${key}_${i}`, at: createdAt, userId: 'u_admin', type: 'create', message: 'Created record' }],
    }
  })
  return { form, records }
}

const extraForms = [
  quickForm({
    key: 'assets',
    name: 'IT Asset Requests',
    description: 'Laptops, monitors and licences requested by staff, approved by management.',
    ageDays: 25,
    stages: [['IT Review', 'it'], ['Management Approval', 'mgmt']],
    fields: [
      ['item', 'Item', 'text', 'it', { required: true }],
      ['requester', 'Requested By', 'text', 'it', { required: true }],
      ['type', 'Asset Type', 'dropdown', 'it', { options: ['Laptop', 'Monitor', 'Software Licence', 'Phone'] }],
      ['priority', 'Priority', 'dropdown', 'it', { options: [...PRIORITY_OPTIONS] }],
      ['needed', 'Needed By', 'date', 'it'],
      ['approval', 'Approval Status', 'dropdown', 'mgmt', { options: ['Pending', 'Approved', 'Rejected'] }],
    ],
    colorBy: 'approval',
    rows: [
      ['MacBook Pro 14"', 'Aisha Khan', 'Laptop', 'High', 3, 'Pending'],
      ['Dell 27" Monitor', 'Rahul Menon', 'Monitor', 'Low', 12, 'Approved'],
      ['Figma Professional', 'Emily Carter', 'Software Licence', 'Medium', 5, 'Pending'],
      ['iPhone 15', 'Daniel Wu', 'Phone', 'Medium', -2, 'Rejected'],
      ['ThinkPad X1', 'Arjun Nair', 'Laptop', 'High', 1, 'Approved'],
    ],
  }),
  quickForm({
    key: 'leave',
    name: 'Leave Requests',
    description: 'Annual, sick and unpaid leave, reviewed by management.',
    ageDays: 40,
    stages: [['Management', 'mgmt']],
    fields: [
      ['employee', 'Employee', 'text', 'mgmt', { required: true }],
      ['type', 'Leave Type', 'dropdown', 'mgmt', { options: ['Annual', 'Sick', 'Unpaid'] }],
      ['start', 'Start Date', 'date', 'mgmt'],
      ['days', 'Days', 'number', 'mgmt'],
      ['status', 'Status', 'dropdown', 'mgmt', { options: ['Pending', 'Approved', 'Rejected'] }],
    ],
    colorBy: 'status',
    rows: [
      ['Fatima Noor', 'Annual', 10, 5, 'Approved'],
      ['Rahul Menon', 'Sick', -1, 2, 'Approved'],
      ['Emily Carter', 'Annual', 21, 10, 'Pending'],
      ['Daniel Wu', 'Unpaid', 30, 3, 'Pending'],
      ['Aisha Khan', 'Annual', 45, 7, 'Rejected'],
    ],
  }),
  quickForm({
    key: 'projects',
    name: 'Project Tracker',
    description: 'Active client projects, delivery status and budget.',
    ageDays: 60,
    stages: [['Development', 'dev'], ['Management Review', 'mgmt']],
    fields: [
      ['project', 'Project', 'text', 'dev', { required: true }],
      ['client', 'Client', 'text', 'dev'],
      ['status', 'Delivery Status', 'dropdown', 'dev', { options: ['Not Started', 'In Progress', 'On Hold', 'Complete'] }],
      ['priority', 'Priority', 'dropdown', 'dev', { options: [...PRIORITY_OPTIONS] }],
      ['due', 'Due Date', 'date', 'dev'],
      ['budget', 'Budget (USD)', 'number', 'mgmt'],
    ],
    colorBy: 'status',
    rows: [
      ['CRM Migration', 'Contoso Ltd', 'In Progress', 'High', 14, 48000],
      ['Mobile App v2', 'Tailspin Toys', 'On Hold', 'Medium', 30, 32000],
      ['Data Warehouse', 'Northwind Traders', 'Complete', 'High', -5, 75000],
      ['Website Revamp', 'Coho Winery', 'Not Started', 'Low', 45, 12000],
      ['Power BI Dashboards', 'Fabrikam Inc', 'In Progress', 'Medium', 7, 18000],
      ['SSO Rollout', 'Litware Inc', 'In Progress', 'High', -3, 9000],
    ],
  }),
  quickForm({
    key: 'onboarding',
    name: 'Client Onboarding',
    description: 'New client setup from signed contract to go-live.',
    ageDays: 18,
    stages: [['Sales Handover', 'sales'], ['IT Setup', 'it']],
    fields: [
      ['client', 'Client', 'text', 'sales', { required: true }],
      ['email', 'Contact Email', 'email', 'sales'],
      ['plan', 'Plan', 'dropdown', 'sales', { options: ['Starter', 'Business', 'Enterprise'] }],
      ['kickoff', 'Kickoff Date', 'date', 'sales'],
      ['status', 'Setup Status', 'dropdown', 'it', { options: ['Not Started', 'In Progress', 'Complete'] }],
    ],
    colorBy: 'status',
    rows: [
      ['Alpine Ski House', 'ops@alpineskihouse.com', 'Business', 4, 'Not Started'],
      ['Blue Yonder Airlines', 'it@blueyonder.com', 'Enterprise', -6, 'In Progress'],
      ['Trey Research', 'admin@treyresearch.net', 'Starter', 9, 'Not Started'],
      ['Wide World Importers', 'hello@wideworld.com', 'Business', -12, 'Complete'],
    ],
  }),
  quickForm({
    key: 'bugs',
    name: 'Bug Tracker',
    description: 'Defects reported by IT and fixed by development.',
    ageDays: 12,
    stages: [['Triage', 'it'], ['Fix', 'dev']],
    fields: [
      ['title', 'Bug', 'text', 'it', { required: true }],
      ['severity', 'Severity', 'dropdown', 'it', { options: ['Critical', 'High', 'Medium', 'Low'] }],
      ['reported', 'Reported On', 'date', 'it'],
      ['status', 'Fix Status', 'dropdown', 'dev', { options: ['Open', 'In Progress', 'Resolved'] }],
    ],
    colorBy: 'severity',
    rows: [
      ['Login fails on Safari', 'Critical', -1, 'In Progress'],
      ['Export button misaligned', 'Low', -4, 'Open'],
      ['Report totals off by one', 'High', -2, 'Open'],
      ['Slow search on large sheets', 'Medium', -6, 'Resolved'],
      ['Notification badge not clearing', 'Medium', -3, 'In Progress'],
    ],
  }),
  quickForm({
    key: 'purchases',
    name: 'Purchase Orders',
    description: 'Vendor purchases raised by sales and signed off by management.',
    ageDays: 33,
    stages: [['Sales', 'sales'], ['Finance Approval', 'mgmt']],
    fields: [
      ['item', 'Item', 'text', 'sales', { required: true }],
      ['vendor', 'Vendor', 'text', 'sales'],
      ['amount', 'Amount (USD)', 'number', 'sales'],
      ['status', 'Approval', 'dropdown', 'mgmt', { options: ['Pending', 'Approved', 'Rejected'] }],
    ],
    colorBy: 'status',
    rows: [
      ['Conference booth', 'EventCo', 4500, 'Pending'],
      ['CRM seats (10)', 'Salesforce', 15000, 'Approved'],
      ['Marketing print run', 'PrintHub', 1200, 'Pending'],
      ['Travel – client visit', 'Contoso Travel', 2300, 'Rejected'],
    ],
  }),
  quickForm({
    key: 'hiring',
    name: 'Recruitment Pipeline',
    description: 'Candidates moving from application to offer.',
    ageDays: 20,
    stages: [['Screening', 'mgmt']],
    fields: [
      ['candidate', 'Candidate', 'text', 'mgmt', { required: true }],
      ['role', 'Role', 'dropdown', 'mgmt', { options: ['Developer', 'Data Analyst', 'Sales Executive', 'IT Support'] }],
      ['interview', 'Interview Date', 'date', 'mgmt'],
      ['stage', 'Candidate Stage', 'dropdown', 'mgmt', { options: ['Applied', 'Interview', 'Offer', 'Hired', 'Rejected'] }],
    ],
    colorBy: 'stage',
    rows: [
      ['Priya Raman', 'Developer', 3, 'Interview'],
      ['Tom Hughes', 'Data Analyst', -2, 'Offer'],
      ['Sara Lopez', 'Sales Executive', 6, 'Applied'],
      ['Kenji Sato', 'IT Support', -9, 'Hired'],
      ['Leah Brown', 'Developer', -4, 'Rejected'],
    ],
  }),
]

export const seedForms = [leadForm, employeeForm, ...extraForms.map((x) => x.form)]
export const seedRecords = [...LEADS.map(buildRecord), ...employeeRecords, ...extraForms.flatMap((x) => x.records)]

export const seedNotifications = [
  { id: 'n_1', teamId: 'it', formId: leadForm.id, recordId: 'rec_7', message: 'Ava Mitchell is ready for IT Review', at: hoursAgo(5), read: false },
  { id: 'n_2', teamId: 'mgmt', formId: leadForm.id, recordId: 'rec_12', message: 'James Ward is awaiting Management approval', at: hoursAgo(8), read: false },
  { id: 'n_3', teamId: 'dev', formId: leadForm.id, recordId: 'rec_11', message: 'Isabella Ross is ready for Development', at: hoursAgo(26), read: false },
  { id: 'n_4', teamId: 'sales', formId: leadForm.id, recordId: 'rec_1', message: 'Olivia Bennett was assigned to Sales', at: hoursAgo(10), read: true },
]

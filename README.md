# Difinity Flow Sheet

A no-code form builder and cross-department workflow tool with a spreadsheet-style UI. React 18 + Tailwind CSS 4 + Vite, with in-memory mock data.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## AI chat setup

The AI chat answers questions about the sheet you have open, using Claude (`claude-opus-5-5`).

1. Copy `.env.example` to `.env.local`.
2. Set `ANTHROPIC_API_KEY=` to your key from console.anthropic.com.
3. Restart `npm run dev`.

The key is read only by the dev/preview server (`server/chatApi.js`, mounted at `/api/chat`). It is never sent to the browser. Without a key, the chat falls back to built-in rule-based answers and says so. A static build (`npm run build` deployed without this server) needs an equivalent `/api/chat` endpoint on your backend.

## Try it

- **Switch roles** with the *Current user* menu in the top bar (Admin, Sales, IT, Dev, Manager). Fields owned by other teams show a lock and can't be edited.
- **+ New Record** adds an editable row at the top of the grid: fill the cells your team owns, then press Enter or *Save record*.
- **Edit in the grid**: cells your team owns are editable in place (dropdowns pick directly; click other cells to type, Enter or click away saves, Esc cancels). The document icon next to the row number opens the record panel with workflow actions (*Mark Stage Complete*, *Approve*, *Reject*, *Return*) and a *History* tab.
- **Row colors**: any Dropdown field can be set to "Color the entire row by this field" (in the form builder or via *Color Rules* in the toolbar). Each option has its own color, and only one field per form drives row colors.
- **AI chat**: ask anything about the open sheet ("What are the top 3 risks?", "Which team is the bottleneck?") and follow up in the same conversation. Record names in replies are clickable.

## Structure

```
src/
  data/models.js      Data shapes (documented), field types, colors, operators
  data/seed.js        Teams, users and 9 sample forms with records (Lead Management, Employee Sheet, …)
  store/reducer.js    All state changes: permissions and workflow rules are enforced here
  store/StoreContext  Provider, action creators (with user-facing validation), UI state
  lib/                Pure logic: permissions, records/status, colorRules, ai, utils
  components/         Sidebar, TopBar, Toolbar, RecordGrid, RecordDrawer, FormBuilder,
                      ColorRulesPanel, WorkflowEditor, NotificationPanel, AIAssistant,
                      NewRecordRow, UsersTeams, FormsList, WorkflowsPage
```

## Adding a backend

Every model is plain JSON (see the comment block at the top of `data/models.js`). Form templates (`forms`) are stored separately from `records`. To add a backend, replace each reducer case with an API call that returns the updated entity. The permission checks in `lib/permissions.js` and `partitionChanges` in `store/reducer.js` are pure functions, so the server can reuse them.

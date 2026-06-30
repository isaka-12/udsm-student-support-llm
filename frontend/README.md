# Frontend — UDSM Student Support Assistant

React 19 web application. Provides student-facing login, registration, and a real-time chat interface that streams responses token-by-token from the FastAPI backend using Server-Sent Events (SSE). Built with Vite, Tailwind CSS v4, and React Router DOM v7.

---

## Folder Structure

```
frontend/
│
├── index.html                   # Vite HTML entry point
├── vite.config.js               # Vite + Tailwind plugin config
├── eslint.config.js             # ESLint flat config
├── package.json
│
└── src/
    ├── main.jsx                 # ReactDOM.createRoot — mounts <App />
    ├── App.jsx                  # Router definition, context providers
    ├── index.css                # Global styles (Tailwind directives, overflow rules)
    ├── App.css                  # Base resets
    │
    ├── assets/
    │   └── udsm.png             # UDSM logo (used in sidebar, auth pages)
    │
    ├── pages/
    │   ├── LoginPage.jsx        # /login — email + password form, JWT login
    │   ├── RegisterPage.jsx     # /register — full name + email + password, JWT register
    │   └── ChatPage.jsx         # /chat — main layout: sidebar + header + messages + input
    │
    ├── components/
    │   ├── auth/
    │   │   └── ProtectedRoute.jsx   # Wraps /chat; redirects to /login if no token
    │   │
    │   ├── chat/
    │   │   ├── Bubble.jsx           # Individual message bubble (user / assistant / error)
    │   │   ├── ChatInput.jsx        # Textarea + send button; handles Enter key
    │   │   ├── MarkdownRenderer.jsx # Renders assistant Markdown with react-markdown + remark-gfm
    │   │   ├── MessageList.jsx      # Scrollable list of Bubble components
    │   │   ├── QuickReplies.jsx     # Suggested topic chips (shown after first answer)
    │   │   └── Welcome.jsx          # Welcome screen with topic cards (shown when no messages)
    │   │
    │   ├── sidebar/
    │   │   ├── DesktopSidebar.jsx   # Collapsible sidebar (md+ screens); session list + New Chat
    │   │   ├── MobileSidebar.jsx    # Slide-in drawer (< md); same session list + New Chat
    │   │   └── ProfileMenu.jsx      # User avatar, display name, logout button
    │   │
    │   └── layout/
    │       └── Header.jsx           # Top bar: hamburger (mobile), title, theme toggle, clear chat
    │
    ├── contexts/
    │   ├── AuthContext.jsx      # isAuthenticated, user, login(), register(), logout()
    │   ├── ChatContext.jsx      # messages, sessions, currentSessionId, sendMessage(), createNewSession(), switchSession()
    │   └── ThemeContext.jsx     # dark/light toggle; Tailwind `dark` class on <html>; persisted to localStorage
    │
    ├── services/
    │   └── api.js               # All backend calls: apiFetch (with Bearer token + 401 auto-logout),
    │                            # loginUser, registerUser, streamQuestion (SSE generator),
    │                            # fetchSessions, fetchHistory, fetchModelInfo, clearHistory
    │
    ├── hooks/
    │   ├── useAutoScroll.js     # Scrolls message list to bottom when messages change
    │   └── useLocalStorage.js   # useState synced to localStorage
    │
    ├── utils/
    │   ├── cn.js                # clsx-style className helper
    │   └── format.js            # fmtTime (HH:MM) · relativeDate (Today / Yesterday / Mon / Jan 5)
    │
    └── data/
        └── constants.js         # QUICK_TOPICS — label + question pairs for quick-reply chips
```

---

## Routes

| Path | Component | Access |
|---|---|---|
| `/` | Redirect → `/login` | — |
| `/login` | `LoginPage` | Public — redirects to `/chat` if already authenticated |
| `/register` | `RegisterPage` | Public — redirects to `/chat` if already authenticated |
| `/chat` | `ChatPage` | Protected — redirects to `/login` if no valid token |

`ProtectedRoute` wraps the `/chat` route. It reads `isAuthenticated` from `AuthContext` and renders `<Outlet />` or `<Navigate to="/login" />`.

---

## State Management

Three React Context providers wrap the entire app (defined in `App.jsx`):

```
<ThemeProvider>
  <AuthProvider>
    <ChatProvider>
      <RouterProvider />
    </ChatProvider>
  </AuthProvider>
</ThemeProvider>
```

### `AuthContext`

Manages the authenticated user. State persisted in `localStorage`:

| Key | Value |
|---|---|
| `udsm_token` | JWT string |
| `udsm_user` | `{email, first_name, last_name}` JSON |

| Value / function | Description |
|---|---|
| `user` | User object or `null` |
| `isAuthenticated` | `true` when both token and user exist in localStorage |
| `login(email, password)` | Calls `POST /auth/login`, persists token + user |
| `register({firstName, lastName, email, password})` | Calls `POST /auth/register`, persists token + user |
| `logout()` | Removes token + user from localStorage, sets `user = null` |

### `ChatContext`

Manages the active chat session and message list.

| Value / function | Description |
|---|---|
| `messages` | Array of `{id, role, content, timestamp, streaming?, isError?}` |
| `isLoading` | `true` while SSE stream is active |
| `modelInfo` | Object from `GET /model-info` |
| `sessions` | Array of `{session_id, title, last_used, message_count}` from backend |
| `currentSessionId` | UUID string (persisted to `localStorage` as `udsm_session_{email}`) |
| `sendMessage(content)` | Appends user + bot messages, streams SSE tokens, refreshes session list on done |
| `createNewSession()` | Generates a new UUID, resets messages to welcome message |
| `switchSession(id)` | Loads message history from `/history/{id}`, sets as current |
| `clearMessages()` | Deletes current session on backend, calls `createNewSession()` |
| `loadSessions()` | Fetches `/sessions` and updates sidebar list |

Session IDs are `crypto.randomUUID()` strings generated on the frontend. Each user's last active session ID is stored in `localStorage` under `udsm_session_{email}` and restored on next login.

### `ThemeContext`

| Value / function | Description |
|---|---|
| `dark` | `boolean` |
| `toggle()` | Flips dark/light; adds/removes `dark` class on `<html>`; persists to `localStorage` |

Defaults to dark mode on first visit.

---

## Key Components

### `LoginPage` / `RegisterPage`

Both use a two-div scroll pattern to work correctly within the global `overflow: hidden` rule required by the chat layout:

```jsx
<div className="h-full overflow-y-auto">      {/* creates own scroll container */}
  <div className="min-h-full flex flex-col items-center justify-center">
    {/* card content */}
  </div>
</div>
```

`RegisterPage` includes a `PasswordStrength` component showing a 4-bar colour indicator (Weak → Strong) based on four regex criteria: length ≥ 8, uppercase letter, digit, special character.

### `ChatPage`

Layout: `flex h-full overflow-hidden`. Three areas:
1. `DesktopSidebar` — hidden on mobile, collapsible to icon-only mode
2. Main area — `flex flex-col flex-1` containing `Header`, `MessageList` or `Welcome`, `QuickReplies`, `ChatInput`
3. `MobileSidebar` — fixed overlay drawer triggered by hamburger in `Header`

`Welcome` is shown when only the welcome message exists (`messages.length === 1`). `QuickReplies` is shown after the first real exchange (`messages.length` between 2 and 3).

### `Bubble`

Renders a single message. User messages align right; assistant messages align left. The assistant bubble uses `MarkdownRenderer` which renders bold, italic, bullet lists, numbered lists, headings, and inline code from the model's Markdown output.

Streaming assistant messages show a pulsing cursor (`streaming: true` state) until the `done` SSE event arrives.

### `DesktopSidebar` / `MobileSidebar`

Both read `sessions`, `currentSessionId`, `createNewSession`, and `switchSession` directly from `useChat()`. The active session is highlighted. `relativeDate()` from `utils/format.js` converts the `last_used` UTC timestamp to "Today", "Yesterday", a day name, or a short date string.

### `api.js` — `streamQuestion`

Async generator using `ReadableStream` / `TextDecoder`:

```javascript
export async function* streamQuestion(question, sessionId) {
  const res = await fetch(`${BASE}/ask`, { method: 'POST', ... });
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) yield JSON.parse(line.slice(6));
    }
  }
}
```

`apiFetch` (used by all non-streaming calls) automatically:
- Adds `Authorization: Bearer <token>` when a token exists in localStorage
- On HTTP 401: clears localStorage and redirects to `/login`

---

## Commands

```bash
# Install dependencies (first time only)
npm install

# Development server — http://localhost:5173
npm run dev

# Production build → dist/
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint
```

---

## Environment Variables

`frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Change `VITE_API_URL` to the deployed backend URL for production builds.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | 19 | UI framework |
| `react-dom` | 19 | DOM renderer |
| `react-router-dom` | 7 | Client-side routing (`createBrowserRouter`) |
| `react-markdown` | 10 | Renders Markdown in assistant messages |
| `remark-gfm` | 4 | GitHub Flavored Markdown (tables, strikethrough, task lists) |
| `lucide-react` | 1.21 | Icon components (Plus, MessageSquare, Sun, Moon, etc.) |
| `axios` | 1.18 | Available; SSE streaming uses native `fetch` instead |
| `tailwindcss` | 4 | Utility-first CSS via Vite plugin |
| `vite` | 8 | Build tool and dev server with HMR |

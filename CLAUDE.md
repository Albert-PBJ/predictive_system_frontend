# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **frontend** repo. For project-wide context (the two-codebase layout, the Django backend, the dual-currency domain model, and the auth contract from the backend's side) see `../CLAUDE.md`. This file covers what's specific to working inside `frontend/`.

## Commands

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build      # tsc -b && vite build  (type-check THEN bundle)
npm run lint       # eslint .
npm run preview    # serve the production build
```

There are no tests and no test runner configured. `npm run build` is the real gate — it runs `tsc -b` first, so a type error fails the build. Run `npm run lint` and `npm run build` to validate changes.

This repo is a **separate git repository** from the backend (the project root is not a git repo). Commit here, not at the root.

## Origin & current state

Scaffolded from the **TailAdmin React** free template (v2.1.0). Most of `src/pages/` and `src/components/` are unmodified template screens that are **not yet routed** in `App.tsx` — treat them as a component library to adapt, not as live features. Only auth and the dashboard shell are wired to this project so far. `App.tsx` routes just `/` (Home), `/profile`, `/blank`, `/signin`, and a `*` fallback.

When adapting template pages into real features, follow the existing TailAdmin patterns (Tailwind utility classes, functional components) so new screens stay visually consistent.

## Auth architecture (the one fully-wired integration)

JWT against the Django API. The flow is layered — when touching it, change the right layer:

- `services/tokenStorage.ts` — the only place that reads/writes JWTs in `localStorage` (keys `maescar.access` / `maescar.refresh`). Never call `localStorage` for tokens elsewhere.
- `services/api.ts` — the shared axios instance. **Use this for every authenticated request.** A request interceptor attaches the access token; a response interceptor transparently refreshes on 401 using a single-flight queue (concurrent 401s trigger one refresh, others wait), and on unrecoverable failure clears tokens and dispatches the `SESSION_EXPIRED_EVENT` window event. A separate `refreshClient` does the refresh call so it can't recurse through the interceptor.
- `services/authService.ts` — `login` / `logout` / `getMe`, built on `api`. Login/logout also manage token persistence and backend blacklisting.
- `context/AuthContext.tsx` — `useAuth()` exposes `user`, `role`, `isAuthenticated`, `isLoading`, `login`, `logout`, `hasRole(...roles)`. Bootstraps `user` from a stored token on mount and listens for `SESSION_EXPIRED_EVENT` to clear state.
- `components/auth/ProtectedRoute.tsx` — wraps routes; redirects to `/signin` (remembering origin via router `state.from`) when unauthenticated, and to `/` when authenticated but lacking a required role. Accepts optional `roles?: Role[]`.

`Role` is `"ADMIN" | "MANAGER" | "SELLER" | "VIEWER"` (`services/auth.types.ts`). The backend API and validation messages are in **Spanish**; comments in this repo are Spanish too, identifiers in English — match that.

### Wiring new data screens
Import `{ api }` from `services/api.ts` and call it directly — token attachment and refresh are handled for you. Don't create new axios instances. Base URL comes from `VITE_API_BASE_URL` in `.env` (defaults to `http://127.0.0.1:8000/api`); the backend dev server is at `http://127.0.0.1:8000`, data under `/api/`, scrapers under `/scrapers/`. Everything requires a valid token.

## Provider & routing structure

`main.tsx` nests providers outside the router: `ThemeProvider` (dark mode) → `AppWrapper` (react-helmet-async for page meta) → `App`. `App.tsx` then mounts `Router` → `AuthProvider` → routes. So `useAuth()` is only available inside `App`, while theme/meta are global. Other contexts: `SidebarContext` (sidebar collapse state), used by `layout/` (`AppLayout`, `AppHeader`, `AppSidebar`, `Backdrop`).

## SVG imports

`vite-plugin-svgr` is configured with `exportType: "named"` and `namedExport: "ReactComponent"` (see `vite.config.ts`). Import icons as `import { ReactComponent as Foo } from "./icon.svg"` — the default export pattern won't work.

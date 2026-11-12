# Docker Overseer — product spec (v1)

Consolidates grilled decisions. Terminology: [GLOSSARY.md](../GLOSSARY.md). Architecture notes: [docs/adr/](adr/).

## Purpose

Centralize **Docker container logs** for local microservice development: register **Managed Services** (working tree + container bindings), show them in a **SvelteKit** UI (list left, logs right), display **git branch** beside each name.

## Runtime and stack

- **Host-native** process with `docker.sock` and local paths ([ADR-0001](adr/0001-host-native-docker-socket.md)).
- **Bun** + **SvelteKit**; server routes for Docker, git, registry; **SSE** log tail to the browser ([ADR-0003](adr/0003-bun-runtime.md)).
- Dev: `bun run dev` → `http://127.0.0.1:5110` by default; `PORT` override.
- **127.0.0.1 only** ([ADR-0004](adr/0004-bind-localhost-only.md)).

## Registry

- Source of truth: `~/.config/docker-overseer/services.yaml`.
- **UI + file**: add / edit / delete via UI; manual YAML edits ok with reload/watch TBD at implement time.
- Fields per Managed Service: **display name** (default: basename of path), **working tree path**, **compose project name** (explicit, prefill from basename), **ordered list of container bindings**, **sidebar order** (drag reorder persisted).

## Container bindings

- Persist as **compose project + service** when Docker labels allow; else **container name** ([ADR-0002](adr/0002-compose-binding-for-containers.md)).
- Registration UX: **Add service** button → dialog; path, names, project; bindings chosen via **container picker** (options from Docker container list, **running only** in v1).

## Git branch label

- Current **branch string** only (no dirty, no SHA).
- Non-git path: show `—`; registration still allowed.

## Sidebar runtime status

Derived from Docker state for bindings only — **not** from log content ([GLOSSARY.md](../GLOSSARY.md)).

| State | Rule |
|--------|------|
| **Stopped** | All bindings non-running; display name **grayed**. |
| **Runtime error** | Any binding: exited non-zero, dead, restarting, OOMKilled; name **red + icon**. |
| **Running** | Otherwise (e.g. some up, clean exits on others). |

Poll Docker ~**5s** while page visible; pause when tab hidden.

- Not running / mismatch: **warning** e.g. `0/N containers up`; tabs remain; per-tab message when tail impossible.

## Log pane

- **v1 selection**: **one** Managed Service at a time; **multi-select** planned later — avoid UI/state that makes multiple services impossible.
- Per service: **tab per container**; **All** tab only when every active stream has parseable timestamps (chrono merge); else hide **All**.
- **Live tail** with pause; ~**10k** lines in-memory per stream; **SSE** from server.
- **stderr**: distinct (muted) color from stdout.
- **Filter**: client substring on buffered lines only.
- Presentation: monospace, **soft wrap**; no syntax highlighting in v1.

## CRUD UX

- Empty state: CTA to **Add service**; log pane hint when nothing selected.
- Row actions: **Edit** (same dialog), **Delete** (confirm).

## Explicitly out of v1

- Multi-row sidebar selection / combined cross-service log view (planned).
- Server-side log grep, auth, LAN bind, dirty git state, log-driven “error” badges.

## Open at implementation

- YAML file watch vs manual refresh after hand edits.
- Bun-compatible Docker client library choice.
- Exact SSE reconnect and pause semantics on server cancel.

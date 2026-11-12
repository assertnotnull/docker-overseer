# Docker Overseer

Local Bun + SvelteKit UI to register microservice working trees and tail their Docker container logs. Product behavior is defined in [docs/SPEC.md](./docs/SPEC.md).

## Prerequisites

- [Bun](https://bun.sh)
- Docker Engine with access to `/var/run/docker.sock`
- `git` on `PATH` (for branch labels)

## Development

```bash
bun run dev
```

Open [http://127.0.0.1:5110](http://127.0.0.1:5110). Override port with `PORT=3000 bun run dev`.

Managed services are stored in `~/.config/docker-overseer/services.yaml`.

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `bun run dev`  | Dev server (loopback)|
| `bun run build`| Production build     |
| `bun run preview` | Preview production build |
| `bun run check`| Typecheck            |

## Project docs

- [GLOSSARY.md](./GLOSSARY.md) — domain terms
- [docs/adr/](./docs/adr/) — architecture decisions

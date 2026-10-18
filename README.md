# system-420

Source bundle for the application.

## Layout
- `client/` — Next.js frontend and static assets
- `server/` — Express, Socket.IO, Prisma backend
- `start.sh` — project startup helper

## Setup
1. Install Node.js and PostgreSQL/Redis.
2. Configure `server/.env` using `server/.env.example` (replace every placeholder).
3. Install dependencies in `client/` and `server/` with `npm ci`.
4. Generate Prisma client from `server/` with `npm run prisma:generate`.
5. Review `start.sh` and package scripts before running anything.

Generated `.next` build output and the Redis `dump.rdb` runtime snapshot are intentionally excluded.

#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

pg_isready -q || pg_ctlcluster 15 main start || true
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes --bind 127.0.0.1 --protected-mode yes

cd "$ROOT/server"
npx prisma generate
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts

# Start backend server in background
cd "$ROOT/server" && npm run dev &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

# Start frontend server (this will be the exposed port)
cd "$ROOT/client" && npm run dev

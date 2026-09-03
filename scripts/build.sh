#!/bin/sh
set -e

# One-time self-heal: this migration failed in production on a duplicate
# "date" value before the unique constraint existed, and Prisma refuses to
# apply anything after a failed migration until it's resolved. The
# migration's SQL now deduplicates before creating the index, so mark the
# old failed attempt rolled back and let the (fixed) migration reapply.
# Harmless no-op once it's actually applied (the resolve call just fails
# and is ignored).
prisma migrate resolve --rolled-back 20260903000004_dispatch_sheet_unique_date_order_ids || true

ok=0
for i in 1 2 3 4 5; do
  if prisma migrate deploy; then
    ok=1
    break
  fi
  sleep 10
done

if [ "$ok" != "1" ]; then
  echo "prisma migrate deploy failed after retries — aborting build" >&2
  exit 1
fi

next build

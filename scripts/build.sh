#!/bin/sh
set -e

# Database migrations run on production deploys (and local builds), not on
# Vercel preview builds — previews often point at the production database.
if [ "$VERCEL_ENV" = "preview" ]; then
  echo "Preview build: skipping database migrations."
else
  prisma migrate deploy
fi

next build

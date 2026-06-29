#!/bin/sh
set -e

echo "⏳ Waiting for database connection..."
node scripts/wait-for-db.js

echo "🔄 Running migrations..."
npm run migrate

echo "🌱 Running seeds..."
npm run seed

echo "🚀 Starting server..."
exec npm start

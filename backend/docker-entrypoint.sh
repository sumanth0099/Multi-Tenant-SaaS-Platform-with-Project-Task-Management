#!/bin/sh
set -e

echo "⏳ Waiting for postgres..."
until nc -z database 5432; do
  echo "postgres startup...";
  sleep 1;
done

echo "🔄 Running migrations..."
npm run migrate

echo "🌱 Running seeds..."
npm run seed

echo "🚀 Starting server..."
exec npm start

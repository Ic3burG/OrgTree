#!/bin/bash
set -e # Exit on error

echo "=== Starting Render Build Process ==="

echo "Step 1: Installing root dependencies (including devDependencies for build)..."
npm ci --include=dev

echo "Step 2: Building frontend..."
npm run build

echo "Step 3: Preparing server assets..."
# Ensure server directory exists
mkdir -p server/dist

# Clean old dist
echo "Cleaning server/dist..."
rm -rf server/dist

# Copy new dist
echo "Copying dist to server/dist..."
cp -r dist server/

echo "Step 4: Installing server production dependencies..."
cd server
npm ci --only=production

echo "Step 5: Rebuilding native modules (better-sqlite3)..."
npm rebuild better-sqlite3

echo "=== Build Process Complete ==="

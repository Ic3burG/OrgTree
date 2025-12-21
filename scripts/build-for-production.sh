#!/bin/bash
set -e # Exit on error

echo "🚀 Building OrgTree for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf server/dist

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "📦 Installing backend dependencies..."
cd server
npm install
cd ..

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Copy frontend to server
echo "📋 Copying frontend build to server..."
cp -r dist server/

# Verify build
echo "✅ Verifying build..."
if [ ! -f "server/dist/index.html" ]; then
  echo "❌ Build failed: index.html not found"
  exit 1
fi

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add . && git commit -m 'Production build'"
echo "2. Push to deploy: git push origin main"
echo "3. Render will automatically deploy from your repository"

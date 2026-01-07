#!/bin/bash

# TypeScript Migration - File Rename Script
# Renames all .js and .jsx files to .ts and .tsx

set -e  # Exit on error

echo "🔄 Starting TypeScript file rename..."
echo ""

# Track counts
jsx_count=0
js_frontend_count=0
js_backend_count=0
js_scripts_count=0
js_tests_count=0

# ============================================================================
# Frontend: Rename .jsx to .tsx
# ============================================================================
echo "📦 Renaming frontend .jsx files to .tsx..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    new_file="${file%.jsx}.tsx"
    mv "$file" "$new_file"
    echo "  ✓ $(basename "$file") → $(basename "$new_file")"
    ((jsx_count++))
  fi
done < <(find src -name "*.jsx" -type f 2>/dev/null)
echo "  Renamed $jsx_count .jsx files"
echo ""

# ============================================================================
# Frontend: Rename .js to .ts (excluding already created .ts files)
# ============================================================================
echo "📦 Renaming frontend .js files to .ts..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    # Skip if corresponding .ts already exists
    ts_file="${file%.js}.ts"
    if [ ! -f "$ts_file" ]; then
      mv "$file" "$ts_file"
      echo "  ✓ $(basename "$file") → $(basename "$ts_file")"
      ((js_frontend_count++))
    fi
  fi
done < <(find src -name "*.js" -type f 2>/dev/null)
echo "  Renamed $js_frontend_count .js files"
echo ""

# ============================================================================
# Backend: Rename server/src .js to .ts
# ============================================================================
echo "🖥️  Renaming backend source .js files to .ts..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    ts_file="${file%.js}.ts"
    if [ ! -f "$ts_file" ]; then
      mv "$file" "$ts_file"
      echo "  ✓ $(basename "$file") → $(basename "$ts_file")"
      ((js_backend_count++))
    fi
  fi
done < <(find server/src -name "*.js" -type f 2>/dev/null)
echo "  Renamed $js_backend_count backend source files"
echo ""

# ============================================================================
# Backend: Rename server/scripts .js to .ts
# ============================================================================
echo "📝 Renaming backend scripts .js files to .ts..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    ts_file="${file%.js}.ts"
    if [ ! -f "$ts_file" ]; then
      mv "$file" "$ts_file"
      echo "  ✓ $(basename "$file") → $(basename "$ts_file")"
      ((js_scripts_count++))
    fi
  fi
done < <(find server/scripts -name "*.js" -type f 2>/dev/null)
echo "  Renamed $js_scripts_count script files"
echo ""

# ============================================================================
# Backend: Rename server/tests .js to .ts
# ============================================================================
echo "🧪 Renaming backend test .js files to .ts..."
while IFS= read -r file; do
  if [ -f "$file" ]; then
    ts_file="${file%.js}.ts"
    if [ ! -f "$ts_file" ]; then
      mv "$file" "$ts_file"
      echo "  ✓ $(basename "$file") → $(basename "$ts_file")"
      ((js_tests_count++))
    fi
  fi
done < <(find server/tests -name "*.js" -type f 2>/dev/null)
echo "  Renamed $js_tests_count test files"
echo ""

# ============================================================================
# Summary
# ============================================================================
total=$((jsx_count + js_frontend_count + js_backend_count + js_scripts_count + js_tests_count))

echo "✅ File rename complete!"
echo ""
echo "📊 Summary:"
echo "  Frontend .jsx → .tsx:  $jsx_count files"
echo "  Frontend .js → .ts:    $js_frontend_count files"
echo "  Backend src .js → .ts: $js_backend_count files"
echo "  Scripts .js → .ts:     $js_scripts_count files"
echo "  Tests .js → .ts:       $js_tests_count files"
echo "  ─────────────────────────────────"
echo "  Total:                 $total files"
echo ""
echo "⚠️  Note: Build will fail until type annotations are added (Phase 4-5)"

#!/bin/bash

# Safe Lint Fixes Script
# Applies only the safest, most predictable fixes

set -e

echo "🚀 Applying safe lint fixes..."

# Function to test integrity
test_integrity() {
    echo "🔍 Testing build and basic functionality..."
    npm run build > /dev/null 2>&1 || { echo "❌ Build failed"; return 1; }
    npm run test:run > /dev/null 2>&1 || { echo "❌ Tests failed"; return 1; }
    echo "✅ Integrity check passed"
    return 0
}

# Initial integrity check
test_integrity || exit 1

# Fix 1: Unused function parameters (safe patterns only)
echo "🔧 Fix 1: Unused function parameters..."
find src test workflow-visualizer/src -name "*.ts" -exec sed -i '' 's/, index)/, _index)/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -exec sed -i '' 's/, stateName,/, _stateName,/g' {} \;

test_integrity || { echo "❌ Failed after parameter fixes"; exit 1; }

# Fix 2: Remove simple unused variables
echo "🔧 Fix 2: Remove unused variables..."
find src test workflow-visualizer/src -name "*.ts" -exec sed -i '' '/const start = await client\.callTool/d' {} \;

test_integrity || { echo "❌ Failed after variable removal"; exit 1; }

# Fix 3: Safe Record<string, any> replacements
echo "🔧 Fix 3: Safe Record<string, any> replacements..."
find src test workflow-visualizer/src -name "*.ts" -exec sed -i '' 's/Record<string, any>/Record<string, unknown>/g' {} \;

test_integrity || { 
    echo "❌ Failed after Record fixes, reverting..."
    git checkout -- src test workflow-visualizer/src
    exit 1
}

# Final lint check
echo "🔍 Final lint check..."
npm run lint 2>&1 | tail -5

echo "✅ Safe lint fixes complete!"
echo "💡 Run 'git add -A && git commit -m \"fix: apply safe lint fixes\"' to commit changes"
EOF

#!/bin/bash

# Aggressive Lint Auto-Fix Script
# Applies automated fixes for common linting issues

set -e

PROJECT_ROOT="$(pwd)"
BACKUP_DIR=".lint-fix-backup"

echo "🚀 Starting aggressive lint auto-fix..."

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r src test workflow-visualizer/src "$BACKUP_DIR/" 2>/dev/null || true

# Function to run tests and build
check_integrity() {
    echo "🔍 Checking build integrity..."
    if ! npm run build > /dev/null 2>&1; then
        echo "❌ Build failed! Restoring backup..."
        rm -rf src test workflow-visualizer/src
        cp -r "$BACKUP_DIR"/* ./
        exit 1
    fi
    
    echo "🧪 Running tests..."
    if ! npm run test:run > /dev/null 2>&1; then
        echo "❌ Tests failed! Restoring backup..."
        rm -rf src test workflow-visualizer/src
        cp -r "$BACKUP_DIR"/* ./
        exit 1
    fi
    
    echo "✅ Integrity check passed"
}

# Fix 1: Replace unused catch parameters
echo "🔧 Fix 1: Unused catch parameters..."
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/} catch (error) {/} catch (_error) {/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/} catch (jsonError) {/} catch (_jsonError) {/g' {} \;

# Fix 2: Replace simple any types with unknown
echo "🔧 Fix 2: Replace any with unknown in safe contexts..."
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/: any;/: unknown;/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/Promise<any>/Promise<unknown>/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/any\[\]/unknown[]/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/Record<string, any>/Record<string, unknown>/g' {} \;

# Fix 3: Add underscore prefix to unused parameters
echo "🔧 Fix 3: Prefix unused parameters with underscore..."
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/(context: ServerContext)/(_context: ServerContext)/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/, context: ServerContext/, _context: ServerContext/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/, args: /, _args: /g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/, index)/, _index)/g' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' 's/, stateName,/, _stateName,/g' {} \;

# Check integrity after basic fixes
check_integrity

# Fix 4: Remove unused variable declarations (be very careful)
echo "🔧 Fix 4: Remove simple unused variables..."
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' '/const start = await client\.callTool/d' {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' '/const conversationState =/,/await this\.conversationManager/d' {} \;

# Check integrity after variable removal
check_integrity

# Fix 5: Replace simple forEach patterns with for...of
echo "🔧 Fix 5: Replace simple forEach with for...of..."

# This is more complex, so let's do it with a more targeted approach
python3 << 'EOF'
import os
import re
import glob

def fix_foreach_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern for simple forEach: array.forEach(item => { ... })
    pattern = r'(\w+)\.forEach\(\((\w+)\) => \{\s*([^}]+)\s*\}\);?'
    
    def replace_foreach(match):
        array_name = match.group(1)
        param_name = match.group(2)
        body = match.group(3).strip()
        return f'for (const {param_name} of {array_name}) {{\n    {body}\n  }}'
    
    content = re.sub(pattern, replace_foreach, content, flags=re.MULTILINE)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed forEach in: {filepath}")
        return True
    return False

# Process TypeScript files
for pattern in ['src/**/*.ts', 'test/**/*.ts', 'workflow-visualizer/src/**/*.ts']:
    for filepath in glob.glob(pattern, recursive=True):
        if os.path.isfile(filepath):
            fix_foreach_in_file(filepath)
EOF

# Check integrity after forEach fixes
check_integrity

# Fix 6: Handle node protocol imports
echo "🔧 Fix 6: Add node: protocol to imports..."
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' "s/from 'fs'/from 'node:fs'/g" {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' "s/from 'path'/from 'node:path'/g" {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' "s/from 'url'/from 'node:url'/g" {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' "s/from 'os'/from 'node:os'/g" {} \;
find src test workflow-visualizer/src -name "*.ts" -type f -exec sed -i '' "s/from 'fs\/promises'/from 'node:fs\/promises'/g" {} \;

# Final integrity check
check_integrity

# Run final lint to see remaining issues
echo "🔍 Running final lint check..."
npm run lint || echo "Some issues remain - this is expected for complex cases"

# Clean up backup if everything succeeded
echo "🧹 Cleaning up backup..."
rm -rf "$BACKUP_DIR"

echo "✅ Aggressive auto-fix complete!"
echo "📊 Run 'npm run lint' to see remaining issues"
EOF

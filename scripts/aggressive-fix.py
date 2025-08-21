#!/usr/bin/env python3

"""
Comprehensive aggressive lint fix script
Fixes the most common and safe linting issues
"""

import re
import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, cwd='.'):
    """Run a command and return success status"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, '', str(e)

def test_integrity():
    """Test build and basic tests"""
    print("🔍 Testing build integrity...")
    success, _, _ = run_command('npm run build')
    if not success:
        print("❌ Build failed!")
        return False
    
    print("🧪 Running quick test...")
    success, _, _ = run_command('npm run test:run -- --run --reporter=basic')
    if not success:
        print("❌ Tests failed!")
        return False
    
    print("✅ Integrity check passed")
    return True

def fix_simple_any_types():
    """Fix simple any types that can be safely replaced with unknown"""
    print("🔧 Fixing simple 'any' types...")
    
    patterns = [
        (r': any;', ': unknown;'),
        (r'Promise<any>', 'Promise<unknown>'),
        (r'any\[\]', 'unknown[]'),
        (r'Record<string, any>', 'Record<string, unknown>'),
    ]
    
    fixed_files = []
    
    for ts_file in Path('.').rglob('*.ts'):
        if any(exclude in str(ts_file) for exclude in ['node_modules', 'dist', '.vibe', 'scripts']):
            continue
            
        try:
            with open(ts_file, 'r') as f:
                content = f.read()
            
            original_content = content
            
            for pattern, replacement in patterns:
                content = re.sub(pattern, replacement, content)
            
            if content != original_content:
                with open(ts_file, 'w') as f:
                    f.write(content)
                fixed_files.append(str(ts_file))
        except Exception as e:
            print(f"Error processing {ts_file}: {e}")
    
    print(f"Fixed 'any' types in {len(fixed_files)} files")
    return len(fixed_files) > 0

def fix_unused_parameters():
    """Fix unused parameters by prefixing with underscore"""
    print("🔧 Fixing unused parameters...")
    
    # Get unused parameter locations from lint output
    success, _, stderr = run_command('npm run lint')
    
    unused_params = []
    lines = stderr.split('\n')
    
    for i, line in enumerate(lines):
        if "Parameter" in line and "is declared but never used" in line:
            # Look for the file and line info in subsequent lines
            for j in range(i+1, min(i+6, len(lines))):
                if ',-[' in lines[j]:
                    match = re.search(r',-\[([^:]+):(\d+):', lines[j])
                    if match:
                        file_path = match.group(1)
                        line_num = int(match.group(2))
                        
                        # Extract parameter name from the error message
                        param_match = re.search(r"Parameter '([^']+)'", line)
                        if param_match:
                            param_name = param_match.group(1)
                            unused_params.append((file_path, line_num, param_name))
                    break
    
    fixed_count = 0
    for file_path, line_num, param_name in unused_params:
        if fix_unused_param_in_file(file_path, line_num, param_name):
            fixed_count += 1
    
    print(f"Fixed {fixed_count} unused parameters")
    return fixed_count > 0

def fix_unused_param_in_file(file_path, line_num, param_name):
    """Fix unused parameter in a specific file"""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        if line_num <= len(lines):
            line = lines[line_num - 1]
            
            # Replace parameter name with underscore prefix
            patterns = [
                (f'{param_name}:', f'_{param_name}:'),
                (f'{param_name})', f'_{param_name})'),
                (f'{param_name},', f'_{param_name},'),
                (f'({param_name})', f'(_{param_name})'),
            ]
            
            original_line = line
            for pattern, replacement in patterns:
                line = line.replace(pattern, replacement)
            
            if line != original_line:
                lines[line_num - 1] = line
                with open(file_path, 'w') as f:
                    f.writelines(lines)
                return True
    except Exception as e:
        print(f"Error fixing {file_path}:{line_num}: {e}")
    
    return False

def fix_unused_variables():
    """Remove simple unused variable declarations"""
    print("🔧 Fixing unused variables...")
    
    patterns_to_remove = [
        r'const start = await client\.callTool.*\n',
        r'const conversationState =\s*\n\s*await this\.conversationManager.*\n',
    ]
    
    fixed_files = []
    
    for ts_file in Path('.').rglob('*.ts'):
        if any(exclude in str(ts_file) for exclude in ['node_modules', 'dist', '.vibe', 'scripts']):
            continue
            
        try:
            with open(ts_file, 'r') as f:
                content = f.read()
            
            original_content = content
            
            for pattern in patterns_to_remove:
                content = re.sub(pattern, '', content, flags=re.MULTILINE)
            
            if content != original_content:
                with open(ts_file, 'w') as f:
                    f.write(content)
                fixed_files.append(str(ts_file))
        except Exception as e:
            print(f"Error processing {ts_file}: {e}")
    
    print(f"Fixed unused variables in {len(fixed_files)} files")
    return len(fixed_files) > 0

def main():
    print("🚀 Starting aggressive lint auto-fix...")
    
    # Test initial state
    if not test_integrity():
        print("❌ Initial integrity check failed!")
        return
    
    total_fixes = 0
    
    # Fix 1: Simple any types
    if fix_simple_any_types():
        total_fixes += 1
        if not test_integrity():
            print("❌ Build failed after fixing 'any' types")
            return
    
    # Fix 2: Unused parameters  
    if fix_unused_parameters():
        total_fixes += 1
        if not test_integrity():
            print("❌ Build failed after fixing unused parameters")
            return
    
    # Fix 3: Unused variables
    if fix_unused_variables():
        total_fixes += 1
        if not test_integrity():
            print("❌ Build failed after fixing unused variables")
            return
    
    # Final lint check
    print("\n🔍 Final lint check...")
    success, _, stderr = run_command('npm run lint')
    
    # Count remaining issues
    warnings = stderr.count('!')
    errors = stderr.count('x ')
    
    print(f"\n✅ Aggressive auto-fix complete!")
    print(f"📊 Applied {total_fixes} types of fixes")
    print(f"🔍 Remaining: {warnings} warnings, {errors} errors")
    
    if total_fixes > 0:
        print("\n💡 Commit these changes and run again for more fixes!")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3

"""
Script to fix unused catch parameters by removing the parameter name
"""

import re
import os
import subprocess
import sys

def get_unused_catch_locations():
    """Get all locations with unused catch parameters from oxlint"""
    try:
        result = subprocess.run(['npm', 'run', 'lint'], 
                              capture_output=True, text=True, cwd='.')
        
        locations = []
        lines = result.stderr.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i]
            if "Catch parameter 'error' is caught but never used" in line:
                # Next few lines should contain the file and line info
                for j in range(i+1, min(i+6, len(lines))):
                    if ',-[' in lines[j]:
                        # Extract file and line number
                        match = re.search(r',-\[([^:]+):(\d+):', lines[j])
                        if match:
                            file_path = match.group(1)
                            line_num = int(match.group(2))
                            locations.append((file_path, line_num))
                        break
            i += 1
        
        return locations
    except Exception as e:
        print(f"Error getting lint results: {e}")
        return []

def fix_unused_catch_in_file(file_path, line_num):
    """Fix unused catch parameter in a specific file at a specific line"""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        if line_num <= len(lines):
            line = lines[line_num - 1]  # Convert to 0-based index
            
            # Check if this line has } catch (error) { or similar
            if re.search(r'}\s*catch\s*\(\s*error\s*\)\s*{', line):
                # Replace with } catch {
                new_line = re.sub(r'}\s*catch\s*\(\s*error\s*\)\s*{', '} catch {', line)
                lines[line_num - 1] = new_line
                
                with open(file_path, 'w') as f:
                    f.writelines(lines)
                
                print(f"Fixed: {file_path}:{line_num}")
                return True
            elif re.search(r'catch\s*\(\s*error\s*\)\s*{', line):
                # Handle cases where catch is on its own line
                new_line = re.sub(r'catch\s*\(\s*error\s*\)\s*{', 'catch {', line)
                lines[line_num - 1] = new_line
                
                with open(file_path, 'w') as f:
                    f.writelines(lines)
                
                print(f"Fixed: {file_path}:{line_num}")
                return True
    except Exception as e:
        print(f"Error fixing {file_path}:{line_num}: {e}")
    
    return False

def test_build():
    """Test that the build still works"""
    try:
        result = subprocess.run(['npm', 'run', 'build'], 
                              capture_output=True, text=True, cwd='.')
        return result.returncode == 0
    except:
        return False

def main():
    print("🔍 Finding unused catch parameters...")
    locations = get_unused_catch_locations()
    
    if not locations:
        print("✅ No unused catch parameters found!")
        return
    
    print(f"Found {len(locations)} unused catch parameters")
    
    fixed_count = 0
    for file_path, line_num in locations:
        if fix_unused_catch_in_file(file_path, line_num):
            fixed_count += 1
    
    print(f"\n🔧 Fixed {fixed_count} unused catch parameters")
    
    # Test build
    print("🏗️  Testing build...")
    if test_build():
        print("✅ Build successful!")
    else:
        print("❌ Build failed - please check the changes")
        sys.exit(1)

if __name__ == '__main__':
    main()

#!/bin/bash

# This script helps quickly add useTranslation import to screen files
# Usage: ./add-translation-import.sh src/screens/user/ProfileScreen.tsx

file="$1"

if [ -z "$file" ]; then
    echo "Usage: $0 <file-path>"
    exit 1
fi

# Check if file exists
if [ ! -f "$file" ]; then
    echo "Error: File $file not found"
    exit 1
fi

# Check if already has useTranslation import
if grep -q "useTranslation" "$file"; then
    echo "File already has useTranslation import"
    exit 0
fi

# Add import after the last import statement
sed -i.bak "/^import.*from/a\\
import { useTranslation } from 'react-i18next';
" "$file"

echo "Added useTranslation import to $file"
echo "Backup saved as $file.bak"

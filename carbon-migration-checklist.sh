#!/bin/bash

echo "==================================="
echo "Carbon Migration Checklist"
echo "==================================="
echo ""

echo "1. BUTTONS TO REPLACE:"
grep -r "className=\"btn" src/app/components/*.tsx | wc -l | xargs echo "   - Found buttons:"
echo ""

echo "2. UNICODE ICONS TO REPLACE:"
grep -r "[‹›⊞⊟⊡⬡◉◈◎⚑◫▶◼✕🖨️]" src/app/components/*.tsx 2>/dev/null | wc -l | xargs echo "   - Found unicode symbols:"
echo ""

echo "3. FILES WITH CUSTOM BUTTONS:"
grep -l "className=\"btn" src/app/components/*.tsx
echo ""

echo "4. NAVIGATION ICONS:"
grep "icon:" src/app/page.tsx | head -5
echo ""

echo "==================================="
echo "Next: Follow NEXT_STEPS.md"
echo "==================================="

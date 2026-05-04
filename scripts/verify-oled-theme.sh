#!/bin/bash

# Script to verify OLED theme consistency
# Searches for non-pure-black colors in dark mode contexts

echo "🔍 Verifying 'Preto OLED Puro' consistency..."
echo "--------------------------------------------"

# Search for common dark mode grey colors in Tailwind classes or hex/rgb
# Excluding tokens.css and the script itself
INCONSISTENCIES=$(rg -i "bg-(gray|zinc|slate|neutral)-(800|900|950)|bg-\[#(1|2)[a-f0-9]{5}\]|bg-slate-950" src --glob '!src/styles/tokens.css' --glob '!scripts/*' -n)

if [ -z "$INCONSISTENCIES" ]; then
  echo "✅ No major OLED inconsistencies found!"
  echo "All backgrounds seem to be using either the theme variables or are correctly black."
else
  echo "⚠️  Found potential OLED inconsistencies:"
  echo "$INCONSISTENCIES"
  echo "--------------------------------------------"
  echo "Recommendation: Replace these with 'bg-background' or 'bg-[#000000]' for pure OLED black."
fi

echo ""
echo "🔍 Checking for shadows in dark mode..."
SHADOWS=$(rg -i "shadow-(sm|md|lg|xl|2xl)" src --glob '!src/styles/*' -n)
if [ -z "$SHADOWS" ]; then
  echo "✅ No shadows found in components (good for OLED)."
else
  echo "ℹ️  Found shadows that might be invisible on OLED black:"
  echo "$SHADOWS"
fi

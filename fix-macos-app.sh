#!/bin/bash
# Fix "Reasonance is damaged" error on macOS
# This removes the quarantine attribute that macOS adds to downloaded apps

set -e

echo "🔧 Fixing Reasonance.app for macOS..."
echo ""

# Find Reasonance.app
APP_PATH=""

# Check common locations
if [ -d "/Applications/Reasonance.app" ]; then
    APP_PATH="/Applications/Reasonance.app"
elif [ -d "$HOME/Applications/Reasonance.app" ]; then
    APP_PATH="$HOME/Applications/Reasonance.app"
elif [ -d "./Reasonance.app" ]; then
    APP_PATH="./Reasonance.app"
elif [ -d "$HOME/Downloads/Reasonance.app" ]; then
    APP_PATH="$HOME/Downloads/Reasonance.app"
fi

# If not found, ask user
if [ -z "$APP_PATH" ]; then
    echo "❓ Where is Reasonance.app located?"
    echo "   (Drag and drop the app here, or type the path)"
    read -r APP_PATH
    # Remove quotes if user dragged and dropped
    APP_PATH="${APP_PATH//\'/}"
fi

# Check if path exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: Reasonance.app not found at: $APP_PATH"
    exit 1
fi

echo "📍 Found: $APP_PATH"
echo ""

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute..."
sudo xattr -cr "$APP_PATH"

# Remove extended attributes
echo "🧹 Removing extended attributes..."
sudo xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true

# Clear code signature (since it's not properly signed)
echo "✍️  Clearing code signature..."
sudo codesign --remove-signature "$APP_PATH/Contents/MacOS/Reasonance" 2>/dev/null || true

# Ad-hoc sign the app
echo "🔏 Ad-hoc signing the app..."
sudo codesign --force --deep --sign - "$APP_PATH"

echo ""
echo "✅ Done! Reasonance.app should now open without issues."
echo ""
echo "💡 To open Reasonance:"
echo "   1. Right-click on Reasonance.app"
echo "   2. Select 'Open'"
echo "   3. Click 'Open' in the dialog"
echo ""
echo "   Or run: open \"$APP_PATH\""
echo ""

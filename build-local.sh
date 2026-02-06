#!/bin/bash
set -e

echo "🚀 Building Reasonance locally..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    export VSCODE_ARCH="arm64"
    export NPM_ARCH="arm64"
    BUILD_TARGET="vscode-darwin-arm64"
    echo "📦 Building for Apple Silicon (ARM64)"
else
    export VSCODE_ARCH="x64"
    export NPM_ARCH="x64"
    BUILD_TARGET="vscode-darwin-x64"
    echo "📦 Building for Intel (x64)"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm ci
else
    echo "✅ Dependencies already installed"
fi

# Download built-in extensions
echo "📥 Downloading built-in extensions..."
node build/lib/builtInExtensions.ts

# Build
echo "🔨 Compiling and packaging..."
npm run gulp ${BUILD_TARGET}-min

# Create archive
echo "📦 Creating archive..."
npm run gulp ${BUILD_TARGET}-archive

echo ""
echo "✅ Build complete!"
echo ""
echo "📂 Output location:"
if [ "$ARCH" = "arm64" ]; then
    echo "   .build/darwin/archive/Reasonance-darwin-arm64.zip"
else
    echo "   .build/darwin/archive/Reasonance-darwin-x64.zip"
fi
echo ""
echo "🎉 You can now extract and run Reasonance!"

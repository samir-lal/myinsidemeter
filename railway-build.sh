#!/bin/bash
echo "🚀 RAILWAY BUILD: Starting Node.js server build"
echo "📁 Current directory: $(pwd)"
echo "📋 Files present:"
ls -la

# Ensure we're using Node.js runtime
echo "🔍 Node version: $(node --version)"
echo "🔍 NPM version: $(npm --version)"

# Build the application
echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "📂 Build output:"
ls -la dist/

echo "✅ Railway build completed - Node.js server ready"
echo "🎯 Starting with: node dist/index.js"
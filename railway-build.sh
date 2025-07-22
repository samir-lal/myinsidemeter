#!/bin/bash
# Railway build script to fix static file path mismatch

echo "🔧 Railway Build Fix: Copying static files to correct location..."

# Remove existing server/public if it exists
rm -rf server/public

# Copy dist/public to server/public
cp -r dist/public server/public

echo "✅ Static files copied: dist/public -> server/public"
echo "📂 Contents check:"
ls -la server/public/ | head -10
#!/bin/bash
# Railway comprehensive build script to fix all static file and routing issues

echo "🔧 Railway Build Fix: Comprehensive static file and routing solution..."

# Debug current build state
echo "📍 Current directory: $(pwd)"
echo "📍 Contents of current directory:"
ls -la | head -10

# Check if build output exists
if [ -d "dist/public" ]; then
    echo "✅ Build output found in dist/public"
    echo "📂 dist/public contents:"
    ls -la dist/public/ | head -5
else
    echo "❌ No dist/public directory found"
    echo "📂 Available directories:"
    find . -name "public" -type d 2>/dev/null | head -5
fi

# Remove existing server/public if it exists
rm -rf server/public

# Copy dist/public to server/public (primary solution)
if [ -d "dist/public" ]; then
    cp -r dist/public server/public
    echo "✅ Static files copied: dist/public -> server/public"
else
    echo "⚠️  dist/public not found, creating basic structure"
    mkdir -p server/public
    echo '<html><body>Static files not found during build</body></html>' > server/public/index.html
fi

# Verify the copy worked
if [ -f "server/public/index.html" ]; then
    echo "✅ index.html exists in server/public"
    echo "📄 File size: $(stat -c%s server/public/index.html 2>/dev/null || stat -f%z server/public/index.html 2>/dev/null || echo 'unknown') bytes"
else
    echo "❌ index.html missing from server/public"
fi

echo "📂 Final server/public contents:"
ls -la server/public/ | head -10

echo "✅ Railway build script completed"
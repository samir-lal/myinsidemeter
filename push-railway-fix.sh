#!/bin/bash

echo "🚀 Adding Railway configuration files..."
git add railway.json nixpacks.toml
git commit -m "Fix Railway deployment: Add railway.json and nixpacks.toml configuration"
git push

echo "✅ Railway configuration pushed to GitHub"
echo "🌐 Railway will now automatically redeploy with proper build configuration"
echo ""
echo "Check Railway deployment logs at: https://railway.app"
echo "Your site should be working at: https://insidemeter.com"
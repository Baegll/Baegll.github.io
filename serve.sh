#!/usr/bin/env bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use default > /dev/null 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8080}"

echo "Building Quartz blog..."
cd "$SCRIPT_DIR/blog"
npx quartz build -o "$SCRIPT_DIR/_site/blog" 2>&1 | tail -3

echo "Copying static files..."
cd "$SCRIPT_DIR"
mkdir -p _site/projects
cp index.html _site/
cp projects/index.html _site/projects/
cp design-tokens.json _site/
cp -r assets _site/

echo ""
echo "Serving at http://localhost:$PORT"
echo "Press Ctrl+C to stop"
npx serve _site -l $PORT

#!/bin/bash
# Run this script on YOUR local computer to copy the JWT auth project
# into /home/hello-moni/Documents/jwt-auth-project

set -e

TARGET="/home/hello-moni/Documents/jwt-auth-project"
SOURCE="$(cd "$(dirname "$0")" && pwd)"

echo "Installing JWT Auth Project..."
echo "  From: $SOURCE"
echo "  To:   $TARGET"

mkdir -p /home/hello-moni/Documents

if [ -d "$TARGET" ]; then
  echo "Removing old installation..."
  rm -rf "$TARGET"
fi

cp -r "$SOURCE" "$TARGET"

# Remove install script from target to avoid confusion
rm -f "$TARGET/install-to-documents.sh"

echo ""
echo "Done! Project installed at: $TARGET"
echo ""
echo "Next steps:"
echo "  cd $TARGET/backend && npm install && cp .env.example .env && npm run dev"
echo "  cd $TARGET/frontend && npm install && cp .env.example .env && npm run dev"

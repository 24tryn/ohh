#!/bin/bash
# Rollback script - Revert to previous version
# Usage: ./rollback.sh [version]

set -e

TARGET_VERSION="${1:?Version required. Usage: ./rollback.sh 1.0.0}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BACKUP_DIR="backups/v${TARGET_VERSION}-*"

echo "⚠️  Rolling back to version $TARGET_VERSION..."

# Find backup
BACKUP=$(ls -d $BACKUP_DIR 2>/dev/null | tail -1)

if [ -z "$BACKUP" ]; then
    echo "❌ No backup found for version $TARGET_VERSION"
    ls -d backups/v* 2>/dev/null || echo "No backups available"
    exit 1
fi

echo "📂 Found backup: $BACKUP"

# Restore files
cp "$BACKUP/index.html" index.html
cp "$BACKUP/ohh.jsx" ohh.jsx
cp "$BACKUP/version.json" version.json

# Update rollout to 0% for safety
sed -i "s/ROLLOUT_PERCENTAGE=.*/ROLLOUT_PERCENTAGE=0/" .env

# Log rollback
echo "[$TIMESTAMP] Rollback: $TARGET_VERSION (rollout 0%)" >> rollout.log

echo "✅ Rollback to $TARGET_VERSION complete!"
echo "📍 Rollout set to 0% - verify before increasing"
echo "📝 Logged to rollout.log"

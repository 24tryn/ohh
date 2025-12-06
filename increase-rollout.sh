#!/bin/bash
# Canary rollout script - Gradually release to users
# Usage: ./increase-rollout.sh [percentage]

set -e

PERCENTAGE="${1:-50}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$PERCENTAGE" -lt 0 ] || [ "$PERCENTAGE" -gt 100 ]; then
    echo "❌ Percentage must be between 0 and 100"
    exit 1
fi

echo "🎯 Starting canary rollout to $PERCENTAGE% of users..."

# Update feature flag
sed -i "s/ROLLOUT_PERCENTAGE=.*/ROLLOUT_PERCENTAGE=$PERCENTAGE/" .env

# Log the rollout
echo "[$TIMESTAMP] Rollout: $PERCENTAGE%" >> rollout.log

# Update version metadata
if command -v jq &> /dev/null; then
    jq ".rollout = {percentage: $PERCENTAGE, timestamp: \"$TIMESTAMP\"}" version.json > version.json.tmp && mv version.json.tmp version.json
fi

# If it's full rollout, update stable version
if [ "$PERCENTAGE" = "100" ]; then
    echo "✅ Full rollout complete! Version is now stable."
fi

echo "📊 Rollout: $PERCENTAGE%"
echo "📝 Logged to rollout.log"
echo ""
echo "📈 Monitoring recommendations:"
echo "  - Watch error rates"
echo "  - Monitor performance metrics"
echo "  - Check user feedback"
echo ""
echo "To rollback: ./rollback.sh [version]"

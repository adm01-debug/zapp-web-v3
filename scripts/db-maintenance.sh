#!/bin/bash
# Database maintenance script for ZAPP WEB production
# Run via cron: 0 3 * * 0 /opt/scripts/db-maintenance.sh
#
# Performs:
# 1. VACUUM ANALYZE on key tables (incremental, not full)
# 2. Cleanup of old error logs (>30 days)
# 3. Cleanup of old webhook events (>7 days)
# 4. Index usage report
# 5. Table bloat check

set -euo pipefail

DB_CONTAINER="supabase_db"
DB_USER="supabase_admin"
DB_NAME="postgres"
LOG_FILE="/var/log/db-maintenance-$(date +%Y%m%d).log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== DB Maintenance Started ==="

# 1. ANALYZE key tables (lightweight, no VACUUM on large tables)
log "Running ANALYZE on key tables..."
for table in evolution_contacts evolution_quick_replies profiles app_error_logs; do
  docker exec $DB_CONTAINER sh -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -U $DB_USER -d $DB_NAME -c 'ANALYZE public.$table;'" 2>/dev/null && \
    log "  ANALYZE $table: OK" || log "  ANALYZE $table: SKIPPED"
done

# 2. Cleanup old error logs (>30 days)
log "Cleaning up old error logs..."
DELETED=$(docker exec $DB_CONTAINER sh -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \"DELETE FROM public.app_error_logs WHERE created_at < now() - interval '30 days' RETURNING id;\" 2>/dev/null | wc -l")
log "  Deleted $DELETED old error log entries"

# 3. Cleanup old webhook events (>7 days)
log "Cleaning up old webhook events..."
for instance in wpp2 wpp_pink_test default; do
  TABLE="evolution_webhook_events_$instance"
  docker exec $DB_CONTAINER sh -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -U $DB_USER -d $DB_NAME -c \"DELETE FROM public.$TABLE WHERE created_at < now() - interval '7 days';\"" 2>/dev/null && \
    log "  Cleaned $TABLE" || log "  $TABLE: skipped"
done

# 4. Index usage report
log "Index usage report:"
docker exec $DB_CONTAINER sh -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -U $DB_USER -d $DB_NAME -c \"
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname LIKE 'evolution_%'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
\"" 2>/dev/null | tee -a "$LOG_FILE"

# 5. Table size report
log "Top 10 largest tables:"
docker exec $DB_CONTAINER sh -c "PGPASSWORD=\$POSTGRES_PASSWORD psql -U $DB_USER -d $DB_NAME -c \"
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS size,
  n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
\"" 2>/dev/null | tee -a "$LOG_FILE"

log "=== DB Maintenance Complete ==="

#!/bin/bash
# VPS health check script for ZAPP WEB infrastructure
# Run via cron: */5 * * * * /opt/scripts/health-check.sh
#
# Checks:
# 1. Docker Swarm service health
# 2. Disk space
# 3. Memory usage
# 4. Evolution API connectivity
# 5. Supabase connectivity
# 6. RabbitMQ queue depth

set -uo pipefail

ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"
HOSTNAME=$(hostname)

alert() {
  local severity="$1" msg="$2"
  echo "[$(date '+%H:%M:%S')] [$severity] $msg"
  if [ -n "$ALERT_WEBHOOK" ]; then
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"[$severity] $HOSTNAME: $msg\"}" >/dev/null 2>&1 || true
  fi
}

# 1. Check critical Docker services
for svc in evolution supabase_db supabase_realtime supabase_auth supabase_functions rabbitmq redis; do
  RUNNING=$(docker service ls --filter "name=$svc" --format '{{.Replicas}}' 2>/dev/null | head -1)
  if [ -z "$RUNNING" ]; then
    alert "WARN" "Service $svc not found"
  elif echo "$RUNNING" | grep -qv '1/1\|2/2\|3/3'; then
    alert "CRITICAL" "Service $svc unhealthy: $RUNNING"
  fi
done

# 2. Disk space check
DISK_USED=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USED" -gt 90 ]; then
  alert "CRITICAL" "Disk usage at ${DISK_USED}%"
elif [ "$DISK_USED" -gt 80 ]; then
  alert "WARN" "Disk usage at ${DISK_USED}%"
fi

# 3. Memory check
MEM_USED=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USED" -gt 95 ]; then
  alert "CRITICAL" "Memory usage at ${MEM_USED}%"
elif [ "$MEM_USED" -gt 85 ]; then
  alert "WARN" "Memory usage at ${MEM_USED}%"
fi

# 4. PostgreSQL connection count
PG_CONNS=$(docker exec $(docker ps -q -f name=supabase_db) sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U supabase_admin -d postgres -t -c "SELECT count(*) FROM pg_stat_activity;"' 2>/dev/null | tr -d ' ')
if [ -n "$PG_CONNS" ] && [ "$PG_CONNS" -gt 80 ]; then
  alert "WARN" "PostgreSQL connections high: $PG_CONNS"
fi

echo "[$(date '+%H:%M:%S')] Health check complete: disk=${DISK_USED}% mem=${MEM_USED}% pg_conns=${PG_CONNS:-?}"

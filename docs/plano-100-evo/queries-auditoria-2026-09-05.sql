-- Queries de verificação usadas na auditoria ao vivo do schema evo (2026-09-05).
-- Reexecutáveis via SUPABASE SELF HOSTED - MCP (supabase_db_query). Conferir identidade antes:
SELECT current_setting('server_version') AS pg, (SELECT count(*) FROM pg_namespace WHERE nspname IN ('zapp','evo')) AS schemas_ok;

-- 1. Inventário físico do evo (tamanho, RLS, comentários, índices, FKs, triggers)
SELECT c.relname, c.relkind, c.relispartition, pg_get_partkeydef(c.oid) AS partkey, c.reltuples::bigint AS est_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total, c.relrowsecurity AS rls,
       obj_description(c.oid,'pg_class') IS NOT NULL AS has_comment,
       (SELECT count(*) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS ncols,
       (SELECT count(*) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND col_description(c.oid,a.attnum) IS NOT NULL) AS ncols_commented,
       (SELECT count(*) FROM pg_index i WHERE i.indrelid=c.oid) AS nidx,
       (SELECT count(*) FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='f') AS nfk,
       (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS ntrg
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='evo' AND c.relkind IN ('r','p') ORDER BY pg_total_relation_size(c.oid) DESC;

-- 2. Índices com uso
SELECT t.relname, i.relname AS indice, pg_get_indexdef(ix.indexrelid) AS def, ix.indisunique, s.idx_scan,
       pg_size_pretty(pg_relation_size(ix.indexrelid)) AS tam
FROM pg_index ix JOIN pg_class i ON i.oid=ix.indexrelid JOIN pg_class t ON t.oid=ix.indrelid
LEFT JOIN pg_stat_user_indexes s ON s.indexrelid=ix.indexrelid
WHERE t.relnamespace='evo'::regnamespace ORDER BY t.relname, s.idx_scan DESC NULLS LAST;

-- 3. Triggers (locais × clonados do parent)
SELECT c.relname, t.tgname, t.tgparentid<>0 AS clonado_do_pai, t.tgenabled, pg_get_triggerdef(t.oid)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relnamespace='evo'::regnamespace AND NOT t.tgisinternal ORDER BY 1,3,2;

-- 4. Funções de trigger e schema onde vivem
SELECT DISTINCT n.nspname, p.proname, p.prosecdef, p.proconfig
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE c.relnamespace='evo'::regnamespace AND NOT t.tgisinternal ORDER BY 1,2;

-- 5. Latência ponta a ponta inbound (7d)
WITH l AS (SELECT received_at, message_id, instance_name FROM evo.ingest_ledger WHERE outcome='inserted' AND received_at > now()-interval '7 days'),
j AS (SELECT EXTRACT(epoch FROM l.received_at - m.wa_timestamp) AS e2e_s FROM l JOIN evo.evolution_messages m ON m.message_id=l.message_id AND m.instance_name=l.instance_name WHERE m.from_me=false)
SELECT count(*), percentile_cont(0.5) WITHIN GROUP (ORDER BY e2e_s) p50, percentile_cont(0.95) WITHIN GROUP (ORDER BY e2e_s) p95,
       percentile_cont(0.99) WITHIN GROUP (ORDER BY e2e_s) p99, max(e2e_s), count(*) FILTER (WHERE e2e_s>60) acima_60s FROM j;

-- 6. Perda PG14 × espelho por classe (48h) — precisa statement_timeout >= 60s
WITH s AS (SELECT key->>'id' AS mid, key->>'remoteJid' AS rj, (key->>'fromMe')::boolean AS fm,
  CASE WHEN jsonb_typeof(message)='object' THEN (SELECT k FROM jsonb_object_keys(message) k WHERE k NOT IN ('messageContextInfo','senderKeyDistributionMessage') LIMIT 1) ELSE 'scalar' END AS mkey
  FROM evo.fdw_evolution_message WHERE "messageTimestamp" > extract(epoch FROM now()-interval '48 hours'))
SELECT s.fm, CASE WHEN s.rj LIKE '%@g.us' THEN 'grupo' WHEN s.rj='status@broadcast' THEN 'status' WHEN s.rj LIKE '%@lid' THEN 'lid' ELSE 'pn' END AS jid_kind,
       s.mkey, count(*) AS total, count(m.id) AS no_espelho, count(*) FILTER (WHERE m.id IS NULL) AS faltando
FROM s LEFT JOIN evo.evolution_messages m ON m.message_id=s.mid AND m.instance_name='wpp2'
GROUP BY 1,2,3 ORDER BY 6 DESC;

-- 7. Backlog RabbitMQ (última captura)
SELECT queue_name, messages, consumers, ready, unacked FROM evo.rabbitmq_backlog_history
WHERE captured_at = (SELECT max(captured_at) FROM evo.rabbitmq_backlog_history) ORDER BY messages DESC;

-- 8. Crons do pipeline com último status
SELECT j.jobid, j.jobname, j.schedule, j.active, left(j.command,120),
       (SELECT status FROM cron.job_run_details r WHERE r.jobid=j.jobid ORDER BY start_time DESC NULLS LAST LIMIT 1) AS last_status,
       (SELECT count(*) FROM cron.job_run_details r WHERE r.jobid=j.jobid AND r.status='failed' AND r.start_time>now()-interval '7 days') AS fails_7d
FROM cron.job j WHERE j.command ~* 'evo\.|evolution|webhook|rabbit|media_|lid_|contact_identity|ingest_ledger|fanout|whatsapp' ORDER BY j.jobname;

-- 9. Qualidade de dados (7d)
SELECT instance_name, count(*) n, count(*) FILTER (WHERE contact_id IS NULL) sem_contact, count(*) FILTER (WHERE conversation_id IS NULL) sem_conv,
       count(*) FILTER (WHERE remote_jid LIKE '%@lid') lid, count(*) FILTER (WHERE status <> lower(status)) status_upper,
       count(*) FILTER (WHERE message_type='unknown') tipo_unknown
FROM evo.evolution_messages WHERE created_at > now()-interval '7 days' GROUP BY 1;

-- 10. Vocabulário message_type
SELECT from_me, message_type, count(*) FROM evo.evolution_messages WHERE created_at > now()-interval '30 days' GROUP BY 1,2 ORDER BY 3 DESC;

-- 11. Alertas abertos
SELECT alert_type, severity, count(*), max(created_at) FROM zapp.evolution_alerts WHERE resolved_at IS NULL GROUP BY 1,2 ORDER BY 3 DESC;

-- 12. PG14 (via portainer_exec_container no container postgres_postgres, user postgres, db evolution)
-- psql -U postgres -d evolution -Atc "select to_char(to_timestamp(\"messageTimestamp\"),'YYYY-MM-DD') d, count(*), count(*) filter (where key->>'remoteJid' like '%@lid') lid from \"Message\" where \"messageTimestamp\" > extract(epoch from now()-interval '14 days') group by 1 order by 1"
-- psql -U postgres -d evolution -Atc "select indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) from pg_stat_user_indexes where relname in ('Message','MessageUpdate') order by idx_scan"

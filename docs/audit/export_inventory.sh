#!/bin/bash
# Script para exportar inventário filtrado
# Uso: ./export_inventory.sh [MODULO] [STATUS]

MODULE=$1
STATUS=$2

echo "Exportando inventário para Módulo: ${MODULE:-TODOS} | Status: ${STATUS:-TODOS}"
grep -E "${MODULE:-.*}" docs/audit/enterprise_audit_report.md | grep -E "${STATUS:-.*}"

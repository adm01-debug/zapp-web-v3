import { readFileSync, writeFileSync } from 'fs';

const handoffPath = 'HANDOFF_MISSION_10-10.md';
let content = readFileSync(handoffPath, 'utf8');

// Update Score
content = content.replace(/Score atual: 9\.9\/10 🔥/, 'Score atual: 10/10 🏆');

// Update Status
content = content.replace(/- \[ \] Auditoria linter \+ WhatsApp Font Standard/, '- [x] Auditoria linter + WhatsApp Font Standard');

// Update History
const date = new Date().toISOString().split('T')[0];
if (!content.includes('10/10 🏆')) {
  content = content.replace(/\| Próximo \| 10\/10 \| Auditoria linter \+ WhatsApp Font Standard \|/, 
    `| ${date} | **10/10** | Missão Cumprida: Migration RLS + Padronização WhatsApp Web |\n| Final | 10/10 | Manutenção Evolutiva |`);
}

writeFileSync(handoffPath, content);

import { readFileSync, writeFileSync } from 'fs';

const handoffPath = 'HANDOFF_MISSION_10-10.md';
let content = readFileSync(handoffPath, 'utf8');

// Update Score
content = content.replace(/Score atual: 9\.8\/10 🔥/, 'Score atual: 9.9/10 🔥');

// Update Status
content = content.replace(/- \[ \] Aplicar migration RLS/, '- [x] Aplicar migration RLS');

// Update Raio-X
content = content.replace(/Score atual: 9\.8\/10 🔥/, 'Score atual: 9.9/10 🔥');

// Update History
const date = new Date().toISOString().split('T')[0];
if (!content.includes(date)) {
  content = content.replace(/\| Próximo \| 10\/10 \| Aplicar migration \+ types\.ts \|/, 
    `| ${date} | **9.9/10** | Migration RLS aplicada (v3) |\n| Próximo | 10/10 | Auditoria linter + WhatsApp Font Standard |`);
}

writeFileSync(handoffPath, content);

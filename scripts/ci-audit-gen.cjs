const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATE_PATH = 'scripts/templates/audit_template.md';
const DOSSIER_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md';

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const author = execSync('git log -1 --format="%an"').toString().trim();
    return { commitHash, date, author };
  } catch (e) {
    return { commitHash: 'N/A', date: new Date().toISOString(), author: 'CI' };
  }
}

function generateDossier() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('Template not found');
    process.exit(1);
  }

  const { commitHash, date, author } = getGitInfo();
  let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Fill in the Evidence Genesis
  const genesisEntry = `| ${date} | CI Audit Generation | ${author} | \`${commitHash}\` | Sucesso |`;
  content = content.replace('GENESIS_ENTRY_PLACEHOLDER', genesisEntry);

  // Ensure target directory exists
  const dir = path.dirname(DOSSIER_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DOSSIER_PATH, content);
  console.log(`Dossier generated at ${DOSSIER_PATH} (Commit: ${commitHash})`);
}

generateDossier();

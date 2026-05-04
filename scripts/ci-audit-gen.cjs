const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function updateEvidenceGenesis() {
  if (!fs.existsSync(DOSSIER_PATH)) return;

  const { commitHash, date, author } = getGitInfo();
  let content = fs.readFileSync(DOSSIER_PATH, 'utf8');

  // Replace Evidence Genesis section or specific markers
  const genesisEntry = `| ${date} | CI Audit Generation | ${author} | \`${commitHash}\` | Sucesso |`;
  
  // Update the operational trail table
  const tableHeader = '| Data/Hora (UTC) | Ação | Responsável | Evidência (Commit/ID) | Status |';
  const tableSeparator = '| :--- | :--- | :--- | :--- | :--- |';
  
  const searchPattern = `${tableHeader}\n${tableSeparator}`;
  if (content.includes(searchPattern)) {
    // Insert after separator if not already there for this commit
    if (!content.includes(commitHash)) {
      content = content.replace(searchPattern, `${searchPattern}\n${genesisEntry}`);
    }
  }

  fs.writeFileSync(DOSSIER_PATH, content);
  console.log(`Updated Evidence Genesis with commit ${commitHash}`);
}

updateEvidenceGenesis();

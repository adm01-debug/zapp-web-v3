const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOSSIER_V5_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md';
const DOSSIER_V6_PATH = 'docs/audit/ENTERPRISE_AUDIT_REPORT_V6.md';

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

function updateAuditFiles() {
  const { commitHash, date, author } = getGitInfo();
  const files = [DOSSIER_V5_PATH, DOSSIER_V6_PATH];

  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update Evidence Genesis (Section 6 usually)
    const genesisLine = `| ${date} | CI Audit Generation | ${author} | \`${commitHash}\` | Sucesso |`;
    
    // Pattern to find the table row and replace it or add new one
    // Look for the table header and add the entry below it
    const tableHeader = '| Data/Hora (UTC) | Ação | Responsável | Commit Ref | Status |';
    const separator = '| :--- | :--- | :--- | :--- | :--- |';
    
    if (content.includes(tableHeader)) {
      const parts = content.split(separator);
      if (parts.length > 1) {
        // We append the new entry as the first row of the table for visibility
        parts[1] = `\n${genesisLine}\n` + parts[1].trim();
        content = parts.join(separator);
      }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath} with commit ${commitHash}`);
  });
}

updateAuditFiles();

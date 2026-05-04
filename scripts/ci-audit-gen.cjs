const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

const DOSSIER_V5_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md';
const DOSSIER_V6_PATH = 'docs/audit/ENTERPRISE_AUDIT_REPORT_V6.md';
const TIMEOUT = parseInt(process.env.AUDIT_LINK_TIMEOUT || '5000');

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const author = execSync('git log -1 --format="%an"').toString().trim();
    const version = process.env.GITHUB_REF_NAME || 'dev';
    return { commitHash, date, author, version };
  } catch (e) {
    return { commitHash: 'N/A', date: new Date().toISOString(), author: 'CI', version: 'local' };
  }
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, { timeout: TIMEOUT }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

async function validateLinks(filePath) {
  if (!fs.existsSync(filePath)) return true;
  const content = fs.readFileSync(filePath, 'utf8');
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  const links = [];
  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }

  const results = await Promise.all(links.map(async (link) => {
    if (link.url.startsWith('http')) {
      return await checkUrl(link.url);
    } else {
      const cleanPath = link.url.split('#')[0];
      const fullPath = path.resolve(process.cwd(), cleanPath);
      return fs.existsSync(fullPath);
    }
  }));

  const invalidCount = results.filter(r => !r).length;
  if (invalidCount > 0) {
    console.error(`[Validation] Found ${invalidCount} broken links in ${filePath}`);
    return false;
  }
  return true;
}

async function updateAuditFiles() {
  const { commitHash, date, author, version } = getGitInfo();
  const files = [DOSSIER_V5_PATH, DOSSIER_V6_PATH];
  let allValid = true;

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update Evidence Genesis
    const genesisLine = `| ${date} | CI Audit (${version}) | ${author} | \`${commitHash}\` | Sucesso |`;
    
    // Improved pattern to find and update the table
    const tableRegex = /(\| Data\/Hora \(UTC\) \|.*?\n\| :--- \| :--- \| :--- \| :--- \| :--- \|\n)([\s\S]*?)(\n\n---|\n\n##|$)/;
    
    if (tableRegex.test(content)) {
      content = content.replace(tableRegex, (match, header, body, footer) => {
        let rows = body.trim().split('\n').filter(r => r.trim() !== '');
        rows.unshift(genesisLine);
        if (rows.length > 10) rows = rows.slice(0, 10); // Keep last 10
        return `${header}${rows.join('\n')}${footer}`;
      });
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath} with commit ${commitHash}`);

    const isValid = await validateLinks(filePath);
    if (!isValid) allValid = false;
  }

  if (!allValid) {
    process.exit(1);
  }
}

updateAuditFiles();

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DOSSIER_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md';
const TIMEOUT = parseInt(process.env.AUDIT_LINK_TIMEOUT || '5000');

async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: TIMEOUT }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function validate() {
  if (!fs.existsSync(DOSSIER_PATH)) {
    console.error(`Error: Dossier not found at ${DOSSIER_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(DOSSIER_PATH, 'utf8');
  const links = [];
  
  // Regex for Markdown links: [text](link)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }

  console.log(`Found ${links.length} links in dossier. Validating...`);

  const results = await Promise.all(links.map(async (link) => {
    let isValid = false;
    let type = 'local';

    if (link.url.startsWith('http')) {
      type = 'external';
      isValid = await checkUrl(link.url);
    } else {
      // Local file link
      const cleanPath = link.url.split('#')[0]; // Remove anchors
      const fullPath = path.resolve(path.dirname(DOSSIER_PATH), cleanPath);
      isValid = fs.existsSync(fullPath);
    }

    return { ...link, isValid, type };
  }));

  const invalidLinks = results.filter(r => !r.isValid);

  if (invalidLinks.length > 0) {
    console.error('\n❌ Broken links found:');
    invalidLinks.forEach(l => {
      console.error(`- [${l.text}](${l.url}) [Type: ${l.type}]`);
    });
    process.exit(1);
  }

  console.log('\n✅ All links are valid.');
}

validate();

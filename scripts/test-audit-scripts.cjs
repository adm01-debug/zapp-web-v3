const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_DIR = 'test-audit-temp';
const DOSSIER_MOCK = path.join(TEST_DIR, 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md');

function setup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'docs/audit'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'scripts'), { recursive: true });
  
  // Create mock files linked in the dossier
  fs.writeFileSync(path.join(TEST_DIR, 'evidence.txt'), 'test');
  
  fs.writeFileSync(DOSSIER_MOCK, `
# Test Dossier
[Valid Local](evidence.txt)
[Invalid Local](missing.txt)
[Valid External](https://google.com)

| Data/Hora (UTC) | Ação | Responsável | Evidência (Commit/ID) | Status |
| :--- | :--- | :--- | :--- | :--- |
`);

  // Copy scripts to test dir
  fs.copyFileSync('scripts/validate-audit-links.cjs', path.join(TEST_DIR, 'scripts/validate-audit-links.cjs'));
  fs.copyFileSync('scripts/ci-audit-gen.cjs', path.join(TEST_DIR, 'scripts/ci-audit-gen.cjs'));
}

function runTests() {
  console.log('Running Audit Scripts Tests...');
  
  // 1. Test validation failure on broken link
  try {
    execSync(`cd ${TEST_DIR} && node scripts/validate-audit-links.cjs`, { stdio: 'pipe' });
    console.error('FAIL: validate-audit-links should have failed for missing.txt');
    process.exit(1);
  } catch (e) {
    console.log('PASS: validate-audit-links failed correctly for broken link.');
  }

  // 2. Fix link and test success
  const content = fs.readFileSync(DOSSIER_MOCK, 'utf8').replace('missing.txt', 'evidence.txt');
  fs.writeFileSync(DOSSIER_MOCK, content);
  
  try {
    execSync(`cd ${TEST_DIR} && node scripts/validate-audit-links.cjs`);
    console.log('PASS: validate-audit-links passed for valid links.');
  } catch (e) {
    console.error('FAIL: validate-audit-links failed for valid links: ' + e.message);
    process.exit(1);
  }

  // 3. Test Evidence Genesis automation
  try {
    execSync(`cd ${TEST_DIR} && node scripts/ci-audit-gen.cjs`);
    const updatedContent = fs.readFileSync(DOSSIER_MOCK, 'utf8');
    if (updatedContent.includes('CI Audit Generation')) {
      console.log('PASS: ci-audit-gen correctly updated the trail.');
    } else {
      console.error('FAIL: ci-audit-gen did not update the trail.');
      process.exit(1);
    }
  } catch (e) {
    console.error('FAIL: ci-audit-gen script error: ' + e.message);
    process.exit(1);
  }

  console.log('\nAll Audit Script Tests Passed! 🎉');
  // Cleanup
  fs.rmSync(TEST_DIR, { recursive: true });
}

setup();
runTests();

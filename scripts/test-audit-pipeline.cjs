const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTest() {
  console.log('🚀 Starting Audit Pipeline Tests...\n');

  // Test 1: ci-audit-gen.cjs
  console.log('Test 1: Running ci-audit-gen.cjs');
  try {
    execSync('node scripts/ci-audit-gen.cjs', { stdio: 'inherit' });
    console.log('✅ ci-audit-gen.cjs executed successfully\n');
  } catch (e) {
    console.error('❌ ci-audit-gen.cjs failed');
    process.exit(1);
  }

  // Test 2: generate-final-dossier.cjs
  console.log('Test 2: Running generate-final-dossier.cjs');
  try {
    execSync('node scripts/generate-final-dossier.cjs', { stdio: 'inherit' });
    console.log('✅ generate-final-dossier.cjs executed successfully\n');
    
    if (fs.existsSync('docs/audit/ENTERPRISE_AUDIT_REPORT_V6.pdf')) {
      console.log('✅ PDF V6 generated');
    } else {
      console.error('❌ PDF V6 NOT generated');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ generate-final-dossier.cjs failed');
    process.exit(1);
  }

  // Test 3: Validate Link Integrity
  console.log('Test 3: Checking for Evidence Genesis updates');
  const content = fs.readFileSync('docs/audit/ENTERPRISE_AUDIT_REPORT_V6.md', 'utf8');
  if (content.includes('CI Audit')) {
    console.log('✅ Evidence Genesis updated in V6\n');
  } else {
    console.error('❌ Evidence Genesis NOT found in V6');
    process.exit(1);
  }

  console.log('🎉 All audit pipeline tests passed!');
}

runTest();

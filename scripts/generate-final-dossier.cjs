const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

const REPORT_V6 = 'docs/audit/ENTERPRISE_AUDIT_REPORT_V6.md';
const OUTPUT_PDF = 'docs/audit/ENTERPRISE_AUDIT_REPORT_V6.pdf';

function markdownToPdf(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Source MD not found: ${inputPath}`);
    return;
  }

  const content = fs.readFileSync(inputPath, "utf8");
  const doc = new jsPDF();
  
  // Custom layout settings
  const margin = 14;
  const pageWidth = 210;
  const maxLineWidth = pageWidth - (margin * 2);
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(44, 62, 80);
  doc.text("Compliance & Audit Report", margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(127, 140, 141);
  doc.text(`Version: V6 | Generated: ${new Date().toISOString()}`, margin, y);
  y += 15;

  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (line.startsWith('# ')) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185);
      doc.text(line.replace('# ', ''), margin, y);
      y += 10;
    } else if (line.startsWith('## ')) {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(52, 73, 94);
      doc.text(line.replace('## ', ''), margin, y);
      y += 8;
    } else if (line.startsWith('### ')) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(line.replace('### ', ''), margin, y);
      y += 6;
    } else if (line.trim().startsWith('|')) {
      // Very basic table handling
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const cleanLine = line.substring(0, 110);
      doc.text(cleanLine, margin, y);
      y += 5;
    } else if (line.trim() !== '') {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(line, maxLineWidth);
      doc.text(splitText, margin, y);
      y += splitText.length * 6;
    } else {
      y += 4;
    }
  });

  const pdfOutput = doc.output();
  fs.writeFileSync(outputPath, pdfOutput, 'binary');
  console.log(`PDF generated at ${outputPath}`);
}

markdownToPdf(REPORT_V6, OUTPUT_PDF);
// Also keep V5 updated for backward compatibility
markdownToPdf('docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md', 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.pdf');

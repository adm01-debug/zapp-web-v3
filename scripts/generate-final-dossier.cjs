const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

const DOSSIER_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md';
const OUTPUT_PATH = 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.pdf';

function markdownToPdf() {
  if (!fs.existsSync(DOSSIER_PATH)) {
    console.error("Dossier MD not found");
    return;
  }

  const content = fs.readFileSync(DOSSIER_PATH, "utf8");
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text("Dossiê de Auditoria Enterprise V5", 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString()} (Auto-generated from MD)`, 14, 28);
  
  let y = 40;
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (line.startsWith('# ')) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      y += 10;
      doc.text(line.replace('# ', ''), 14, y);
      y += 5;
    } else if (line.startsWith('## ')) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      y += 8;
      doc.text(line.replace('## ', ''), 14, y);
      y += 5;
    } else if (line.trim() !== '' && !line.startsWith('|')) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(line, 180);
      doc.text(splitText, 14, y);
      y += splitText.length * 5;
    } else if (line.startsWith('|')) {
      // Simple table text representation for now
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const tableLine = line.substring(0, 100); // Truncate long lines
      doc.text(tableLine, 14, y);
      y += 4;
    }
    
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const pdfOutput = doc.output();
  fs.writeFileSync(OUTPUT_PATH, pdfOutput, 'binary');
  console.log(`PDF generated at ${OUTPUT_PATH}`);
}

markdownToPdf();

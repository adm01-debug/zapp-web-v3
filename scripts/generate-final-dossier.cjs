const { jsPDF } = require("jspdf");
require("jspdf-autotable");
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
  
  const margin = 14;
  const pageWidth = 210;
  const maxLineWidth = pageWidth - (margin * 2);
  let y = 20;

  // Header / Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text("Relatório de Auditoria Enterprise", margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(127, 140, 141);
  doc.text(`Versão: Final | Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
  y += 15;

  const lines = content.split('\n');
  let tableData = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableData = [];
      }
      
      // Skip separator lines | :--- |
      if (line.includes(':---') || line.includes('---:')) continue;
      
      const rows = line.split('|').filter(cell => cell.trim() !== '' || line.startsWith('|') && line.endsWith('|')).map(cell => cell.trim());
      // Handle the case where split includes empty start/end
      if (line.startsWith('|') && rows.length > 0) {
          // rows are fine
      }
      
      const cleanRows = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
          if (idx === 0 && c === '') return false;
          if (idx === arr.length - 1 && c === '') return false;
          return true;
      });

      tableData.push(cleanRows);
      continue;
    } else if (inTable) {
      inTable = false;
      if (tableData.length > 0) {
        doc.autoTable({
          startY: y,
          head: [tableData[0]],
          body: tableData.slice(1),
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: margin, right: margin }
        });
        y = doc.lastAutoTable.finalY + 10;
      }
    }

    if (line.startsWith('# ')) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text(line.replace('# ', ''), margin, y);
      y += 12;
    } else if (line.startsWith('## ')) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(52, 73, 94);
      doc.text(line.replace('## ', ''), margin, y);
      y += 10;
    } else if (line.startsWith('### ')) {
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(line.replace('### ', ''), margin, y);
      y += 8;
    } else if (line !== '') {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(line, maxLineWidth);
      doc.text(splitText, margin, y);
      y += splitText.length * 5 + 2;
    } else {
      y += 3;
    }
  }

  const pdfOutput = doc.output();
  fs.writeFileSync(outputPath, pdfOutput, 'binary');
  console.log(`PDF gerado: ${outputPath}`);
}

// Generate reports
markdownToPdf(REPORT_V6, OUTPUT_PDF);
markdownToPdf('docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md', 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.pdf');


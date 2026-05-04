import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as fs from "fs";
import * as path from "path";

// Add type definition for jspdf-autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  doc.setFontSize(12);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
  
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
    } else if (line.startsWith('|')) {
      // Table handling could be complex, for this prototype we'll just skip or do simple text
      // In a real scenario, we'd parse the markdown table for autoTable
    } else if (line.trim() !== '') {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(line, 180);
      doc.text(splitText, 14, y);
      y += splitText.length * 5;
    }
    
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const buffer = doc.output('arraybuffer');
  fs.writeFileSync(OUTPUT_PATH, Buffer.from(buffer));
  console.log(`PDF generated at ${OUTPUT_PATH}`);
}

markdownToPdf();

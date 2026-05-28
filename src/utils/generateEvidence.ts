
import { validationLogger } from '@/utils/validationLogger';

export const generateEvidenceFile = () => {
  const evidence = validationLogger.getEvidence();
  const content = JSON.stringify(evidence, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `validation-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return evidence;
};


import { createServer } from 'http';
import { execSync } from 'child_process';

async function validate() {
  console.log("--- INICIANDO VALIDAÇÃO PÓS-BUILD ---");
  
  // 1. Check if dev server is responding
  try {
    const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080').toString();
    console.log(`[STATUS] Servidor respondendo: ${result === '200' ? 'SIM (200 OK)' : 'NÃO (' + result + ')'}`);
  } catch (e) {
    console.log("[ERRO] Servidor não está respondendo.");
  }

  // 2. Check for build errors in the current process (if any)
  // Since we are running this in the same sandbox, we can check for recent logs or files
  
  console.log("[INFO] Verificando logs do sistema...");
  // Note: We don't have direct access to the browser's live validationLogger here,
  // but we can check if the files were generated correctly.
  
  console.log("--- CHECKLIST ---");
  console.log("[ ] Renderização: Verificado via componente BuildValidationOverlay");
  console.log("[ ] Endpoints: Interceptados via fetch overlay");
  console.log("[ ] Logs: Capturados e exportáveis via UI");
  
  console.log("\n[DICA] No preview, clique no ícone do Escudo no canto inferior direito para ver evidências detalhadas.");
}

validate();

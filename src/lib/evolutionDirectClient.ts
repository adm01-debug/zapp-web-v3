/**
 * Direct Evolution API call — bypasses edge function when config is in localStorage.
 * Used when EVOLUTION_API_KEY in edge function secrets is outdated/wrong.
 */
const LS_EVO_CONFIG_KEY = "zapp_evolution_config";

interface DirectEvoConfig {
  evolution_api_url: string;
  evolution_api_key: string;
}

export function getDirectConfig(): DirectEvoConfig | null {
  try {
    const raw = localStorage.getItem(LS_EVO_CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as DirectEvoConfig;
    if (cfg.evolution_api_url && cfg.evolution_api_key) return cfg;
  } catch {}
  return null;
}

function mapActionToEndpoint(action: string, instanceName?: string): { path: string; method: string } | null {
  const i = instanceName || "_";
  const map: Record<string, [string, string]> = {
    "list-instances": [`/instance/fetchInstances`, "GET"],
    "connect": [`/instance/connect/${i}`, "GET"],
    "status": [`/instance/connectionState/${i}`, "GET"],
    "instance-info": [`/instance/info/${i}`, "GET"],
    "create-instance": [`/instance/create`, "POST"],
    "restart-instance": [`/instance/restart/${i}`, "PUT"],
    "disconnect": [`/instance/logout/${i}`, "DELETE"],
    "delete-instance": [`/instance/delete/${i}`, "DELETE"],
    "set-presence": [`/instance/setPresence/${i}`, "POST"],
    "get-settings": [`/settings/find/${i}`, "GET"],
    "set-settings": [`/settings/set/${i}`, "POST"],
    "get-webhook": [`/webhook/find/${i}`, "GET"],
    "set-webhook": [`/webhook/set/${i}`, "POST"],
    "send-text": [`/message/sendText/${i}`, "POST"],
    "send-media": [`/message/sendMedia/${i}`, "POST"],
    "send-audio": [`/message/sendWhatsAppAudio/${i}`, "POST"],
  };
  const entry = map[action];
  if (!entry) return null;
  return { path: entry[0], method: entry[1] };
}

export async function callEvolutionDirect<T>(config: DirectEvoConfig, action: string, body?: Record<string, unknown>): Promise<T> {
  const instanceName = (body?.instanceName as string) || undefined;
  const endpoint = mapActionToEndpoint(action, instanceName);
  if (!endpoint) return Promise.reject(new Error("No direct mapping for action: " + action));
  const url = config.evolution_api_url.replace(/\/+$/, "") + endpoint.path;
  const fetchOpts: RequestInit = {
    method: endpoint.method,
    headers: { "apikey": config.evolution_api_key, "Content-Type": "application/json" },
  };
  if (["POST", "PUT"].includes(endpoint.method) && body) {
    fetchOpts.body = JSON.stringify(body);
  }
  const response = await fetch(url, fetchOpts);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({})) as any;
    throw Object.assign(new Error(errData.message || "HTTP " + response.status), {
      apiStatus: response.status,
      details: errData,
    });
  }
  return response.json();
}

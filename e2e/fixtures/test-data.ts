/**
 * Dados de teste E2E — JIDs/instâncias marcadas para cleanup automático.
 * NUNCA usar dados de produção aqui.
 */
export const TEST_INSTANCE = 'wpp2-test';
export const TEST_PHONE = '5511999999999';
export const TEST_REMOTE_JID = `${TEST_PHONE}@s.whatsapp.net`;
export const TEST_CONTACT_NAME = 'E2E Bot Contato';

export const MOCK_EVOLUTION_SEND_RESPONSE = {
  key: { id: 'MOCK_E2E_MSG_ID', fromMe: true, remoteJid: TEST_REMOTE_JID },
  status: 'PENDING',
  message: { conversation: 'mock' },
  messageTimestamp: Math.floor(Date.now() / 1000),
};

export const MOCK_QR_CODE_RESPONSE = {
  pairingCode: 'ABCD-1234',
  code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  count: 1,
};

export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'e2e-bot@zappweb.test';
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'change-me-in-ci';

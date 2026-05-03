/**
 * E2E Test Helpers for ZAPP WEB.
 *
 * Provides reusable utilities for Playwright E2E tests.
 * Includes page objects, mock data factories, and auth helpers.
 */

import type { Page } from '@playwright/test';

/** Login to the app with test credentials */
export async function login(page: Page, email = 'test@zappweb.com', password = 'test123') {
  await page.goto('/auth');
  await page.fill('[data-testid=email-input]', email);
  await page.fill('[data-testid=password-input]', password);
  await page.click('[data-testid=login-button]');
  // Wait for session or specific redirect
  await page.waitForSelector('.inbox-container, .dashboard-container, [data-testid=chat-panel]', { timeout: 15000 });
}

/** Login with a specific role (simulated by email) */
export async function loginAs(page: Page, role: 'admin' | 'agent' | 'viewer' | 'rh_agent' | 'finance_agent' | 'ti_admin' | 'transfer_agent') {
  const credentials = {
    admin: { email: 'admin@zappweb.com', pass: 'admin123' },
    agent: { email: 'agent@zappweb.com', pass: 'agent123' },
    viewer: { email: 'viewer@zappweb.com', pass: 'viewer123' },
    rh_agent: { email: 'agent_rh@zappweb.com', pass: 'rh123' },
    finance_agent: { email: 'agent_fin@zappweb.com', pass: 'fin123' },
    ti_admin: { email: 'admin_ti@zappweb.com', pass: 'ti123' },
    transfer_agent: { email: 'agent_trans@zappweb.com', pass: 'trans123' },
  };
  await login(page, credentials[role].email, credentials[role].pass);
}

/** Navigate to a specific inbox conversation */
export async function openConversation(page: Page, contactName: string) {
  await page.goto('/inbox');
  await page.fill('[data-testid=inbox-search]', contactName);
  await page.click(`[data-testid=conversation-item]:has-text("${contactName}")`);
  await page.waitForSelector('[data-testid=chat-panel]');
}

/** Send a message in the active chat */
export async function sendMessage(page: Page, content: string) {
  const input = page.locator('[data-testid=message-input]');
  await input.fill(content);
  await input.press('Enter');
  // Wait for message to appear in the message list
  await page.waitForSelector(`text="${content}"`, { timeout: 5000 });
}

/** Wait for a toast notification with specific text */
export async function waitForToast(page: Page, text: string, timeout = 5000) {
  await page.waitForSelector(`[data-testid=toast]:has-text("${text}")`, { timeout });
}

/** Create a mock message for testing */
export function createMockMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    contact_id: 'test-contact-1',
    whatsapp_connection_id: 'test-conn-1',
    content: 'Test message',
    message_type: 'text',
    sender: 'contact',
    status: 'delivered',
    timestamp: new Date().toISOString(),
    external_id: null,
    media_url: null,
    quoted_message_id: null,
    ...overrides,
  };
}

/** Create a mock conversation for testing */
export function createMockConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: `conv_${Date.now()}`,
    contact: {
      id: 'test-contact-1',
      name: 'Jo\u00e3o Silva',
      phone: '5511999999999',
      avatar: null,
    },
    assignedTo: {
      id: 'agent-1',
      name: 'Agente Teste',
    },
    lastMessage: 'Ol\u00e1, preciso de ajuda',
    lastMessageTime: new Date(),
    unreadCount: 1,
    status: 'open',
    channel: 'whatsapp',
    sentiment: 'neutral',
    ...overrides,
  };
}

/** Accessibility check: verify no ARIA violations on current page */
export async function checkA11y(page: Page) {
  // Check for basic accessibility issues
  const images = await page.$$('img:not([alt])');
  if (images.length > 0) {
    console.warn(`[A11y] ${images.length} images without alt text`);
  }

  const buttons = await page.$$('button:not([aria-label]):not(:has(text))');
  if (buttons.length > 0) {
    console.warn(`[A11y] ${buttons.length} buttons without labels`);
  }
}

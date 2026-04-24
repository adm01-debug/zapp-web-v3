/**
 * Universal Evolution / WhatsApp message extractor.
 *
 * O webhook da Evolution entrega payloads com `message.<tipo>Message` onde
 * cada tipo (18+) tem uma forma diferente. Esta função normaliza tudo para
 * uma forma plana usada pelo frontend (e por adapters/edge functions),
 * evitando que cada componente reimplemente o pattern matching.
 *
 * Cobertura:
 *  conversation, extendedTextMessage, imageMessage, videoMessage,
 *  audioMessage (PTT), documentMessage, documentWithCaptionMessage,
 *  stickerMessage, locationMessage, liveLocationMessage, contactMessage,
 *  contactsArrayMessage, reactionMessage, pollCreationMessage,
 *  pollUpdateMessage, listMessage, buttonsMessage, templateMessage,
 *  protocolMessage (revoke/edit), viewOnceMessageV2, ephemeralMessage.
 */

export type ExtractedKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'ptt'
  | 'document'
  | 'sticker'
  | 'location'
  | 'live-location'
  | 'contact'
  | 'contacts'
  | 'reaction'
  | 'poll'
  | 'poll-update'
  | 'list'
  | 'buttons'
  | 'template'
  | 'revoke'
  | 'edit'
  | 'view-once'
  | 'ephemeral'
  | 'unknown';

export interface ExtractedMessage {
  kind: ExtractedKind;
  rawType: string;
  text: string | null;
  caption: string | null;
  mimetype: string | null;
  mediaUrl: string | null;
  fileName: string | null;
  /** Latitude / longitude / address for `location` and `live-location`. */
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  /** vCard payload (string) for contacts. */
  vcard?: string | string[];
  /** Reaction emoji + key target. */
  reaction?: { emoji: string; targetId?: string };
  /** Poll metadata. */
  poll?: { name: string; options: string[]; selectableCount?: number };
  /** Quoted message id, when available. */
  quotedId: string | null;
  /** Original Evolution `message` object preserved for downstream use. */
  raw: Record<string, unknown>;
}

type AnyRecord = Record<string, unknown>;

function asRecord(v: unknown): AnyRecord | null {
  return v && typeof v === 'object' ? (v as AnyRecord) : null;
}

function s(v: unknown): string | null {
  return typeof v === 'string' && v.length ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function quotedFrom(node: AnyRecord | null): string | null {
  if (!node) return null;
  const ctx = asRecord(node.contextInfo);
  return s(ctx?.stanzaId) ?? null;
}

/** Resolve message wrappers (ephemeralMessage, viewOnceMessageV2, etc.). */
function unwrap(message: AnyRecord): { node: AnyRecord; wrapper: ExtractedKind | null } {
  const ephemeral = asRecord(message.ephemeralMessage);
  if (ephemeral) {
    const inner = asRecord(ephemeral.message);
    if (inner) return { node: inner, wrapper: 'ephemeral' };
  }
  const viewOnce = asRecord(message.viewOnceMessage) ?? asRecord(message.viewOnceMessageV2);
  if (viewOnce) {
    const inner = asRecord(viewOnce.message);
    if (inner) return { node: inner, wrapper: 'view-once' };
  }
  return { node: message, wrapper: null };
}

/**
 * Extract a normalized message from an Evolution payload.
 * Accepts either the full webhook event or the `message` object directly.
 */
export function extractMessage(payload: unknown): ExtractedMessage {
  const root = asRecord(payload) ?? {};
  const message = asRecord(root.message) ?? root;
  const { node, wrapper } = unwrap(message);

  const empty: ExtractedMessage = {
    kind: 'unknown',
    rawType: 'unknown',
    text: null,
    caption: null,
    mimetype: null,
    mediaUrl: null,
    fileName: null,
    quotedId: null,
    raw: node,
  };

  // 1. Plain text
  const conversation = s(node.conversation);
  if (conversation) {
    return { ...empty, kind: 'text', rawType: 'conversation', text: conversation };
  }

  const ext = asRecord(node.extendedTextMessage);
  if (ext) {
    return {
      ...empty,
      kind: 'text',
      rawType: 'extendedTextMessage',
      text: s(ext.text),
      quotedId: quotedFrom(ext),
    };
  }

  // 2. Media
  const mediaMap: Array<{ key: string; kind: ExtractedKind }> = [
    { key: 'imageMessage', kind: 'image' },
    { key: 'videoMessage', kind: 'video' },
    { key: 'audioMessage', kind: 'audio' },
    { key: 'documentMessage', kind: 'document' },
    { key: 'documentWithCaptionMessage', kind: 'document' },
    { key: 'stickerMessage', kind: 'sticker' },
  ];
  for (const { key, kind } of mediaMap) {
    let media = asRecord(node[key]);
    if (key === 'documentWithCaptionMessage' && media) {
      media = asRecord(media.message)?.documentMessage as AnyRecord | undefined ?? media;
    }
    if (!media) continue;
    const isPtt = kind === 'audio' && media.ptt === true;
    return {
      ...empty,
      kind: isPtt ? 'ptt' : kind,
      rawType: key,
      caption: s(media.caption),
      mimetype: s(media.mimetype),
      mediaUrl: s(media.url) ?? s(media.directPath),
      fileName: s(media.fileName) ?? s(media.title),
      quotedId: quotedFrom(media),
    };
  }

  // 3. Location
  const loc = asRecord(node.locationMessage);
  if (loc) {
    const lat = num(loc.degreesLatitude);
    const lng = num(loc.degreesLongitude);
    if (lat != null && lng != null) {
      return {
        ...empty,
        kind: 'location',
        rawType: 'locationMessage',
        location: { latitude: lat, longitude: lng, name: s(loc.name) ?? undefined, address: s(loc.address) ?? undefined },
      };
    }
  }
  const live = asRecord(node.liveLocationMessage);
  if (live) {
    const lat = num(live.degreesLatitude);
    const lng = num(live.degreesLongitude);
    if (lat != null && lng != null) {
      return {
        ...empty,
        kind: 'live-location',
        rawType: 'liveLocationMessage',
        caption: s(live.caption),
        location: { latitude: lat, longitude: lng },
      };
    }
  }

  // 4. Contacts
  const contact = asRecord(node.contactMessage);
  if (contact) {
    return {
      ...empty,
      kind: 'contact',
      rawType: 'contactMessage',
      text: s(contact.displayName),
      vcard: s(contact.vcard) ?? undefined,
    };
  }
  const contacts = asRecord(node.contactsArrayMessage);
  if (contacts) {
    const arr = Array.isArray(contacts.contacts) ? (contacts.contacts as AnyRecord[]) : [];
    return {
      ...empty,
      kind: 'contacts',
      rawType: 'contactsArrayMessage',
      vcard: arr.map((c) => s(c.vcard) ?? '').filter(Boolean),
    };
  }

  // 5. Reaction
  const reaction = asRecord(node.reactionMessage);
  if (reaction) {
    const key = asRecord(reaction.key);
    return {
      ...empty,
      kind: 'reaction',
      rawType: 'reactionMessage',
      reaction: { emoji: s(reaction.text) ?? '', targetId: s(key?.id) ?? undefined },
    };
  }

  // 6. Polls
  const poll = asRecord(node.pollCreationMessage) ?? asRecord(node.pollCreationMessageV2) ?? asRecord(node.pollCreationMessageV3);
  if (poll) {
    const opts = Array.isArray(poll.options) ? (poll.options as AnyRecord[]) : [];
    return {
      ...empty,
      kind: 'poll',
      rawType: 'pollCreationMessage',
      text: s(poll.name),
      poll: {
        name: s(poll.name) ?? '',
        options: opts.map((o) => s(o.optionName) ?? '').filter(Boolean),
        selectableCount: num(poll.selectableOptionsCount) ?? undefined,
      },
    };
  }
  const pollUpdate = asRecord(node.pollUpdateMessage);
  if (pollUpdate) {
    return { ...empty, kind: 'poll-update', rawType: 'pollUpdateMessage' };
  }

  // 7. Interactive — list / buttons / templates
  const list = asRecord(node.listMessage);
  if (list) {
    return {
      ...empty,
      kind: 'list',
      rawType: 'listMessage',
      text: s(list.description) ?? s(list.title),
    };
  }
  const buttons = asRecord(node.buttonsMessage);
  if (buttons) {
    return { ...empty, kind: 'buttons', rawType: 'buttonsMessage', text: s(buttons.contentText) };
  }
  const template = asRecord(node.templateMessage);
  if (template) {
    return { ...empty, kind: 'template', rawType: 'templateMessage' };
  }

  // 8. Protocol (revoke / edit)
  const proto = asRecord(node.protocolMessage);
  if (proto) {
    const type = num(proto.type);
    if (type === 0) return { ...empty, kind: 'revoke', rawType: 'protocolMessage:revoke' };
    if (type === 14) return { ...empty, kind: 'edit', rawType: 'protocolMessage:edit' };
    return { ...empty, kind: 'unknown', rawType: 'protocolMessage' };
  }

  return wrapper ? { ...empty, kind: wrapper, rawType: wrapper } : empty;
}

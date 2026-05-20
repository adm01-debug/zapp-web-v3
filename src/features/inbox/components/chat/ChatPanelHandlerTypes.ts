/**
 * Shared type definitions for dialog management across ChatPanel and its handlers.
 *
 * This file resolves the `as any` type-safety gap between ChatPanel.tsx
 * (which defines DialogKey as a narrow union) and useChatPanelHandlers.ts
 * (which previously received `openDialog` / `closeDialog` as `any`).
 *
 * By exporting the canonical DialogKey type, both files can import it and
 * maintain full type safety without casting.
 */

export type DialogKey =
  | 'quickReplies'
  | 'slashCommands'
  | 'transferDialog'
  | 'scheduleDialog'
  | 'callDialog'
  | 'globalSearch'
  | 'chatSearch'
  | 'interactiveBuilder'
  | 'forwardDialog'
  | 'locationPicker'
  | 'aiAssistant'
  | 'catalogDirect'
  | 'whisper'
  | 'templatesWithVars'
  | 'realtimeTranscription'
  | 'closeDialog';

export type DialogState = Record<DialogKey, boolean>;

export type DialogAction =
  | { type: 'TOGGLE'; key: DialogKey }
  | { type: 'OPEN'; key: DialogKey }
  | { type: 'CLOSE'; key: DialogKey }
  | { type: 'RESET'; keys: DialogKey[] };

export const initialDialogState: DialogState = {
  quickReplies: false,
  slashCommands: false,
  transferDialog: false,
  scheduleDialog: false,
  callDialog: false,
  globalSearch: false,
  chatSearch: false,
  interactiveBuilder: false,
  forwardDialog: false,
  locationPicker: false,
  aiAssistant: false,
  catalogDirect: false,
  whisper: false,
  templatesWithVars: false,
  realtimeTranscription: false,
  closeDialog: false,
};

export function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, [action.key]: !state[action.key] };
    case 'OPEN':
      return state[action.key] ? state : { ...state, [action.key]: true };
    case 'CLOSE':
      return state[action.key] ? { ...state, [action.key]: false } : state;
    case 'RESET': {
      const next = { ...state };
      let changed = false;
      for (const k of action.keys) {
        if (next[k]) {
          next[k] = false;
          changed = true;
        }
      }
      return changed ? next : state;
    }
    default:
      return state;
  }
}

/** Type-safe callback signatures for dialog management */
export type OpenDialogFn = (key: DialogKey) => void;
export type CloseDialogFn = (key: DialogKey) => void;

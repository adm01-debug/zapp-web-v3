# Design System Audit

## src/ViolationTest.tsx
| Priority | Line | Raw Match | Clean | Suggestion | Patch |
|---|---|---|---|---|---|
| High | 3 | `text-[#000000]` | `text-[#000000]` | text-background | `text-background` |
| Medium | 3 | `bg-red-500` | `bg-red-500` | Use semantic tokens (destructive, muted, etc.) | - |
| High | 4 | `dark:bg-white` | `bg-white` | dark:bg-background | `dark:bg-background` |
| Medium | 6 | `bg-blue-600` | `bg-blue-600` | bg-primary | `bg-primary` |

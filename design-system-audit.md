# Design System Audit
Generated on: 5/6/2026, 5:30:05 PM

## src/TestAudit.tsx
| Priority | Line | Type | Raw Match | Variant | Clean Match | Suggestion | Patch |
|---|---|---|---|---|---|---|---|
| Low | 2 | Arbitrary Color | `bg-[#ff0000]` | `(none)` | `bg-[#ff0000]` | Check design system tokens | - |
| Medium | 2 | Literal Color | `text-blue-500` | `(none)` | `text-blue-500` | text-primary | `text-primary` |
| Low | 2 | Literal Font | `font-sans` | `(none)` | `font-sans` | Remove literal font; use global typography | - |
| High | 3 | Literal Color | `dark:text-white` | `dark:` | `text-white` | dark:text-foreground | `dark:text-foreground` |


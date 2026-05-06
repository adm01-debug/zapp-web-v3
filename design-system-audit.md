# Design System Audit
Generated on: 5/6/2026, 5:29:34 PM

## src/TestAudit.tsx
| Priority | Line | Type | Raw Match | Variant | Clean Match | Suggestion |
|---|---|---|---|---|---|---|
| High | 2 | Arbitrary Color | `bg-[#ff0000]` | `(none)` | `bg-[#ff0000]` | Use theme tokens (primary, secondary, etc.) |
| Medium | 2 | Literal Color | `text-blue-500` | `(none)` | `text-blue-500` | text-primary |
| Medium | 3 | Literal Color | `dark:text-white` | `dark:` | `text-white` | Use semantic tokens (destructive, muted, etc.) |



# Design System Audit Report
Generated on: 5/6/2026, 5:07:24 PM

Total violations found: 829

| File | Line | Type | Content |
|------|------|------|---------|
| src/App.css | 15 | Hardcoded Hex Color | `filter: drop-shadow(0 0 2em #646cffaa);` |
| src/App.css | 18 | Hardcoded Hex Color | `filter: drop-shadow(0 0 2em #61dafbaa);` |
| src/App.css | 41 | Hardcoded Hex Color | `color: #888;` |
| src/components/AppErrorBoundary.tsx | 97 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground mb-4 f...` |
| src/components/CommandPalette.tsx | 123 | Hardcoded Font Family | `<span className="ml-auto text-[10px] text-muted-fo...` |
| src/components/ThemeInitializer.tsx | 76 | Hardcoded Font Family | `root.style.setProperty('--font-sans', targetFont);` |
| src/components/ThemeInitializer.tsx | 85 | Hardcoded Font Family | `activeFont: getComputedStyle(root).getPropertyValu...` |
| src/components/a11y/a11yComponents.tsx | 86 | Hardcoded Font Family | `<kbd className="px-2 py-1 text-xs font-mono bg-mut...` |
| src/components/agents/AgentCard.tsx | 30 | Literal Tailwind Color (bg-gray-100) | `const statusColor = AGENT_STATUS_COLORS[agent.stat...` |
| src/components/agents/AgentCard.tsx | 30 | Literal Tailwind Color (text-gray-700) | `const statusColor = AGENT_STATUS_COLORS[agent.stat...` |
| src/components/ai/__tests__/ChurnPredictionDashboard.test.tsx | 159 | Literal Tailwind Color (text-white) | `case 'high': return 'bg-orange-500 text-white';` |
| src/components/ai/__tests__/ChurnPredictionDashboard.test.tsx | 160 | Literal Tailwind Color (text-white) | `case 'medium': return 'bg-yellow-500 text-white';` |
| src/components/ai/__tests__/ChurnPredictionDashboard.test.tsx | 160 | Literal Tailwind Color (bg-yellow-500) | `case 'medium': return 'bg-yellow-500 text-white';` |
| src/components/ai/__tests__/ChurnPredictionDashboard.test.tsx | 161 | Literal Tailwind Color (text-white) | `case 'low': return 'bg-primary text-white';` |
| src/components/calls/CallDialog.tsx | 198 | Hardcoded Font Family | `<p className="text-whatsapp font-mono text-lg">{fo...` |
| src/components/calls/DialPad.tsx | 154 | Hardcoded Font Family | `className="text-center text-xl font-mono tracking-...` |
| src/components/campaigns/CampaignsView.tsx | 158 | Hardcoded Font Family | `<span className="text-xs text-muted-foreground fon...` |
| src/components/catalog/ProductManagement.tsx | 122 | Hardcoded Font Family | `<TableCell className="font-mono text-sm">{product....` |
| src/components/chatbot/ChatbotFlowsView.tsx | 205 | Hardcoded Font Family | `<span className="bg-secondary/30 px-2 py-0.5 round...` |
| src/components/compliance/PrivacyAuditTrail.tsx | 77 | Hardcoded Font Family | `Entidade: <span className="font-mono">{entry.entit...` |
| src/components/connections/ConnectionCard.tsx | 26 | Literal Tailwind Color (bg-red-500) | `disconnected: { label: 'Desconectado', color: 'tex...` |
| src/components/connections/ConnectionCard.tsx | 26 | Literal Tailwind Color (text-red-400) | `disconnected: { label: 'Desconectado', color: 'tex...` |
| src/components/connections/ConnectionCard.tsx | 119 | Literal Tailwind Color (bg-red-500) | `isConnected && !isPhantomLike ? 'bg-primary/15' : ...` |
| src/components/connections/ConnectionCard.tsx | 122 | Literal Tailwind Color (text-red-400) | `<Smartphone className={cn('w-5 h-5', isConnected &...` |
| src/components/connections/ConnectionCard.tsx | 159 | Literal Tailwind Color (bg-red-400) | `isConnected && !isPhantomLike ? 'bg-primary' : nee...` |
| src/components/connections/ConnectionCard.tsx | 286 | Literal Tailwind Color (bg-red-500) | `className="mt-3 px-3 py-2 rounded-lg bg-red-500/8 ...` |
| src/components/connections/ConnectionCard.tsx | 288 | Literal Tailwind Color (text-red-400) | `<AlertTriangle className="w-3.5 h-3.5 text-red-400...` |
| src/components/connections/ConnectionCard.tsx | 289 | Literal Tailwind Color (text-red-300) | `<span className="text-xs text-red-300">` |
| src/components/connections/ConnectionsView.tsx | 212 | Literal Tailwind Color (text-red-400) | `{ label: 'Ações necessárias', value: connections.f...` |
| src/components/connections/IdempotencyMissBanner.tsx | 81 | Hardcoded Font Family | `className="text-[10px] gap-1 font-mono"` |
| src/components/connections/IdempotencyMissBanner.tsx | 109 | Hardcoded Font Family | `className="font-mono text-xs"` |
| src/components/connections/IdempotencyMissBanner.tsx | 133 | Hardcoded Font Family | `className="font-mono text-[11px]"` |
| src/components/connections/OfficialApiConfigDialog.tsx | 127 | Hardcoded Font Family | `<div className="rounded-md bg-muted/50 px-3 py-2 t...` |
| src/components/contacts/ActivityTimeline.tsx | 23 | Literal Tailwind Color (bg-blue-100) | `telegram:'bg-blue-100 text-blue-800',` |
| src/components/contacts/ActivityTimeline.tsx | 23 | Literal Tailwind Color (text-blue-800) | `telegram:'bg-blue-100 text-blue-800',` |
| src/components/contacts/ActivityTimeline.tsx | 24 | Literal Tailwind Color (text-gray-700) | `email:'bg-muted text-gray-700',` |
| src/components/contacts/AuditLogPanel.tsx | 27 | Literal Tailwind Color (bg-blue-100) | `UPDATE:    'bg-blue-100 text-blue-800 border-blue-...` |
| src/components/contacts/AuditLogPanel.tsx | 27 | Literal Tailwind Color (text-blue-800) | `UPDATE:    'bg-blue-100 text-blue-800 border-blue-...` |
| src/components/contacts/AuditLogPanel.tsx | 28 | Literal Tailwind Color (bg-red-100) | `DELETE:    'bg-red-100 text-red-800 border-red-300...` |
| src/components/contacts/AuditLogPanel.tsx | 28 | Literal Tailwind Color (text-red-800) | `DELETE:    'bg-red-100 text-red-800 border-red-300...` |
| src/components/contacts/AuditLogPanel.tsx | 126 | Literal Tailwind Color (text-red-600) | `<span className="text-red-600 line-through truncat...` |
| src/components/contacts/ConflictResolutionDialog.tsx | 83 | Literal Tailwind Color (bg-blue-50) | `className="gap-1 flex-1 border-blue-300 text-blue-...` |
| src/components/contacts/ConflictResolutionDialog.tsx | 83 | Literal Tailwind Color (text-blue-700) | `className="gap-1 flex-1 border-blue-300 text-blue-...` |
| src/components/contacts/Contact360Panel.tsx | 177 | Hardcoded Font Family | `<p className="text-sm text-muted-foreground font-m...` |
| src/components/contacts/ContactActivityFeed.tsx | 27 | Literal Tailwind Color (bg-blue-100) | `conversation_open: 'bg-blue-100 text-blue-600', co...` |
| src/components/contacts/ContactActivityFeed.tsx | 27 | Literal Tailwind Color (text-blue-600) | `conversation_open: 'bg-blue-100 text-blue-600', co...` |
| src/components/contacts/ContactActivityFeed.tsx | 27 | Literal Tailwind Color (text-gray-600) | `conversation_open: 'bg-blue-100 text-blue-600', co...` |
| src/components/contacts/ContactActivityFeed.tsx | 28 | Literal Tailwind Color (bg-blue-100) | `edit: 'bg-blue-100 text-blue-600', lgpd: 'bg-prima...` |
| src/components/contacts/ContactActivityFeed.tsx | 28 | Literal Tailwind Color (text-blue-600) | `edit: 'bg-blue-100 text-blue-600', lgpd: 'bg-prima...` |
| src/components/contacts/ContactActivityFeed.tsx | 29 | Literal Tailwind Color (bg-red-100) | `merge: 'bg-purple-100 text-purple-600', delete: 'b...` |
| src/components/contacts/ContactActivityFeed.tsx | 29 | Literal Tailwind Color (text-red-600) | `merge: 'bg-purple-100 text-purple-600', delete: 'b...` |
| src/components/contacts/ContactActivityFeed.tsx | 30 | Literal Tailwind Color (bg-yellow-100) | `restore: 'bg-amber-100 text-amber-600', note: 'bg-...` |
| src/components/contacts/ContactActivityFeed.tsx | 30 | Literal Tailwind Color (text-yellow-600) | `restore: 'bg-amber-100 text-amber-600', note: 'bg-...` |
| src/components/contacts/ContactAnalyticsDashboard.tsx | 183 | Hardcoded Font Family | `<div className="absolute -top-5 left-1/2 -translat...` |
| src/components/contacts/ContactAuditLogPanel.tsx | 31 | Literal Tailwind Color (bg-blue-100) | `UPDATE:  { label: 'Editado',   color: 'bg-blue-100...` |
| src/components/contacts/ContactAuditLogPanel.tsx | 31 | Literal Tailwind Color (text-blue-800) | `UPDATE:  { label: 'Editado',   color: 'bg-blue-100...` |
| src/components/contacts/ContactAuditLogPanel.tsx | 32 | Literal Tailwind Color (bg-red-100) | `DELETE:  { label: 'Excluído',  color: 'bg-red-100 ...` |
| src/components/contacts/ContactAuditLogPanel.tsx | 32 | Literal Tailwind Color (text-red-800) | `DELETE:  { label: 'Excluído',  color: 'bg-red-100 ...` |
| src/components/contacts/ContactBitrix24Panel.tsx | 84 | Literal Tailwind Color (bg-gray-100) | `unknown: 'bg-gray-100 text-gray-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 84 | Literal Tailwind Color (text-gray-700) | `unknown: 'bg-gray-100 text-gray-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 85 | Literal Tailwind Color (bg-blue-100) | `lead: 'bg-blue-100 text-blue-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 85 | Literal Tailwind Color (text-blue-700) | `lead: 'bg-blue-100 text-blue-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 89 | Literal Tailwind Color (bg-red-100) | `churned: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 89 | Literal Tailwind Color (text-red-700) | `churned: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactBitrix24Panel.tsx | 113 | Literal Tailwind Color (text-blue-600, text-blue-800) | `className="flex items-center gap-2 text-sm text-bl...` |
| src/components/contacts/ContactCard.tsx | 183 | Hardcoded Font Family | `className="font-mono text-[11px] truncate hover:te...` |
| src/components/contacts/ContactConsentManager.tsx | 171 | Literal Tailwind Color (text-red-600) | `<p className="text-red-600">` |
| src/components/contacts/ContactDialogs.tsx | 120 | Hardcoded Font Family | `<code className="text-sm font-mono font-semibold t...` |
| src/components/contacts/ContactDuplicatesPanel.tsx | 193 | Hardcoded Font Family | `<span className="font-mono">{group.phone_normalize...` |
| src/components/contacts/ContactErrorBoundary.tsx | 74 | Hardcoded Font Family | `<AlertDescription className="font-mono break-all">` |
| src/components/contacts/ContactFormV3.tsx | 257 | Hardcoded Font Family | `className={`font-mono ${hasDuplicates && duplicate...` |
| src/components/contacts/ContactImportDialog.tsx | 274 | Literal Tailwind Color (text-blue-600) | `{ label: 'Atualizados', value: result.updated, col...` |
| src/components/contacts/ContactImportDialogV2.tsx | 123 | Literal Tailwind Color (text-blue-700) | `<div><p className="text-xl font-bold text-blue-700...` |
| src/components/contacts/ContactImportDialogV2.tsx | 124 | Literal Tailwind Color (text-gray-500) | `<div><p className="text-xl font-bold text-gray-500...` |
| src/components/contacts/ContactInlineEdit.tsx | 137 | Literal Tailwind Color (bg-red-50) | `className="p-1 text-red-600 hover:bg-red-50 rounde...` |
| src/components/contacts/ContactInlineEdit.tsx | 137 | Literal Tailwind Color (text-red-600) | `className="p-1 text-red-600 hover:bg-red-50 rounde...` |
| src/components/contacts/ContactListItem.tsx | 130 | Hardcoded Font Family | `className="font-mono text-[11px] hover:text-primar...` |
| src/components/contacts/ContactMergeDialog.tsx | 278 | Hardcoded Font Family | `<Badge variant={confidenceScore > 60 ? "default" :...` |
| src/components/contacts/ContactMergePanel.tsx | 139 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground font-m...` |
| src/components/contacts/ContactNotesPanel.tsx | 29 | Literal Tailwind Color (bg-gray-100) | `{ value: 'general',  label: '📝 Geral',     color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 29 | Literal Tailwind Color (text-gray-700) | `{ value: 'general',  label: '📝 Geral',     color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 30 | Literal Tailwind Color (bg-blue-100) | `{ value: 'call',     label: '📞 Ligação',   color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 30 | Literal Tailwind Color (text-blue-700) | `{ value: 'call',     label: '📞 Ligação',   color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 34 | Literal Tailwind Color (bg-red-100) | `{ value: 'lgpd',     label: '⚖️ LGPD',      color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 34 | Literal Tailwind Color (text-red-700) | `{ value: 'lgpd',     label: '⚖️ LGPD',      color:...` |
| src/components/contacts/ContactNotesPanel.tsx | 151 | Literal Tailwind Color (bg-gray-100) | `<Badge className={`text-xs px-1.5 py-0 h-4 ${TYPE_...` |
| src/components/contacts/ContactPhoneManager.tsx | 150 | Hardcoded Font Family | `<span className="flex-1 font-mono text-sm">` |
| src/components/contacts/ContactPhoneManager.tsx | 198 | Hardcoded Font Family | `className="font-mono"` |
| src/components/contacts/ContactQuickPeek.tsx | 88 | Hardcoded Font Family | `<span className="font-mono text-[11px]">{contact.p...` |
| src/components/contacts/ContactQuickView.tsx | 136 | Literal Tailwind Color (bg-blue-500) | `<div className="w-1.5 h-1.5 rounded-full bg-blue-5...` |
| src/components/contacts/ContactRecycleBin.tsx | 134 | Literal Tailwind Color (bg-red-50) | `contact.days_remaining <= 3 ? 'border-red-200 bg-r...` |
| src/components/contacts/ContactResultsSummary.tsx | 46 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded border borde...` |
| src/components/contacts/ContactResultsSummary.tsx | 47 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded border borde...` |
| src/components/contacts/ContactResultsSummary.tsx | 48 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded border borde...` |
| src/components/contacts/ContactRow.tsx | 21 | Literal Tailwind Color (bg-gray-100) | `novo:        'bg-gray-100 text-gray-700',` |
| src/components/contacts/ContactRow.tsx | 21 | Literal Tailwind Color (text-gray-700) | `novo:        'bg-gray-100 text-gray-700',` |
| src/components/contacts/ContactRow.tsx | 22 | Literal Tailwind Color (bg-blue-100) | `em_contato:  'bg-blue-100 text-blue-700',` |
| src/components/contacts/ContactRow.tsx | 22 | Literal Tailwind Color (text-blue-700) | `em_contato:  'bg-blue-100 text-blue-700',` |
| src/components/contacts/ContactRow.tsx | 27 | Literal Tailwind Color (bg-red-100) | `perdido:     'bg-red-100 text-red-700',` |
| src/components/contacts/ContactRow.tsx | 27 | Literal Tailwind Color (text-red-700) | `perdido:     'bg-red-100 text-red-700',` |
| src/components/contacts/ContactSLAIndicator.tsx | 23 | Literal Tailwind Color (bg-red-50, bg-red-950) | `breached: { label: 'SLA estourado', icon: <AlertTr...` |
| src/components/contacts/ContactSLAIndicator.tsx | 23 | Literal Tailwind Color (text-red-700, text-red-400) | `breached: { label: 'SLA estourado', icon: <AlertTr...` |
| src/components/contacts/ContactSLAIndicator.tsx | 24 | Literal Tailwind Color (bg-slate-50) | `paused:   { label: 'SLA pausado',   icon: <Pause c...` |
| src/components/contacts/ContactSLAIndicator.tsx | 24 | Literal Tailwind Color (text-slate-600) | `paused:   { label: 'SLA pausado',   icon: <Pause c...` |
| src/components/contacts/ContactSLAIndicator.tsx | 25 | Literal Tailwind Color (text-gray-400) | `none:     { label: 'Sem SLA',       icon: <Clock c...` |
| src/components/contacts/ContactSLAIndicator.tsx | 51 | Hardcoded Font Family | `<span className="font-mono text-[10px]">({formatRe...` |
| src/components/contacts/ContactSidebarPanel.tsx | 26 | Literal Tailwind Color (bg-blue-100) | `novo: 'bg-gray-100 text-gray-700', em_contato: 'bg...` |
| src/components/contacts/ContactSidebarPanel.tsx | 26 | Literal Tailwind Color (bg-gray-100) | `novo: 'bg-gray-100 text-gray-700', em_contato: 'bg...` |
| src/components/contacts/ContactSidebarPanel.tsx | 26 | Literal Tailwind Color (text-blue-700) | `novo: 'bg-gray-100 text-gray-700', em_contato: 'bg...` |
| src/components/contacts/ContactSidebarPanel.tsx | 26 | Literal Tailwind Color (text-gray-700) | `novo: 'bg-gray-100 text-gray-700', em_contato: 'bg...` |
| src/components/contacts/ContactSidebarPanel.tsx | 29 | Literal Tailwind Color (bg-red-100) | `perdido: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactSidebarPanel.tsx | 29 | Literal Tailwind Color (text-red-700) | `perdido: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactSidebarPanel.tsx | 64 | Literal Tailwind Color (bg-gray-100) | `<Badge className={`text-xs ${LEAD_COLORS[safeConta...` |
| src/components/contacts/ContactSidebarPanel.tsx | 64 | Literal Tailwind Color (text-gray-700) | `<Badge className={`text-xs ${LEAD_COLORS[safeConta...` |
| src/components/contacts/ContactSidebarPanel.tsx | 123 | Hardcoded Font Family | `<span className="font-medium">ID:</span><span clas...` |
| src/components/contacts/ContactSidebarPanel.tsx | 125 | Hardcoded Font Family | `<span className="font-medium">JID:</span><span cla...` |
| src/components/contacts/ContactSidebarPanel.tsx | 130 | Hardcoded Font Family | `{safeContact.merge_source_id && <><span className=...` |
| src/components/contacts/ContactStatsDashboard.tsx | 42 | Literal Tailwind Color (bg-blue-100) | `novo: 'bg-blue-100 text-blue-700', em_contato: 'bg...` |
| src/components/contacts/ContactStatsDashboard.tsx | 42 | Literal Tailwind Color (text-blue-700) | `novo: 'bg-blue-100 text-blue-700', em_contato: 'bg...` |
| src/components/contacts/ContactStatsDashboard.tsx | 45 | Literal Tailwind Color (bg-red-100) | `perdido: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactStatsDashboard.tsx | 45 | Literal Tailwind Color (text-red-700) | `perdido: 'bg-red-100 text-red-700',` |
| src/components/contacts/ContactStatsDashboard.tsx | 98 | Literal Tailwind Color (text-red-600) | `<span className={`flex items-center gap-1 text-xs ...` |
| src/components/contacts/ContactStatsDashboard.tsx | 136 | Literal Tailwind Color (text-red-600) | `<p className={`text-2xl font-bold ${consentRate >=...` |
| src/components/contacts/ContactStatsDashboard.tsx | 159 | Literal Tailwind Color (bg-gray-100) | `<div key={status} className={`flex items-center ga...` |
| src/components/contacts/ContactsRichView.tsx | 250 | Literal Tailwind Color (text-yellow-400) | `<Zap className={cn("w-4 h-4", highContrast ? "text...` |
| src/components/contacts/ContactsRichView.tsx | 538 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 542 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 546 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 554 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 558 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 562 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 566 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 570 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded bg-muted bor...` |
| src/components/contacts/ContactsRichView.tsx | 576 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground italic...` |
| src/components/contacts/ContactsStatsBar.tsx | 113 | Literal Tailwind Color (bg-slate-50) | `className="gap-1 py-0 text-[10.5px] border-border ...` |
| src/components/contacts/ContactsStatsBar.tsx | 113 | Literal Tailwind Color (text-slate-600) | `className="gap-1 py-0 text-[10.5px] border-border ...` |
| src/components/contacts/ContactsTable.tsx | 189 | Hardcoded Font Family | `<HighlightText text={contact.phone} highlight={sea...` |
| src/components/contacts/ContactsTableVirtual.tsx | 127 | Hardcoded Font Family | `<div className="flex items-center gap-1.5 text-[11...` |
| src/components/contacts/ContactsViewV3.tsx | 89 | Hardcoded Font Family | `<Badge variant="outline" className="text-xs font-m...` |
| src/components/contacts/DuplicateContactsPanel.tsx | 204 | Hardcoded Font Family | `<span className="text-xs text-muted-foreground fon...` |
| src/components/contacts/LGPDComplianceDashboard.tsx | 112 | Literal Tailwind Color (text-red-500) | `icon: <UserX className="h-4 w-4 text-red-500" />,` |
| src/components/contacts/LGPDComplianceDashboard.tsx | 114 | Literal Tailwind Color (text-red-600) | `color: 'text-red-600',` |
| src/components/conversations/ConversationList.tsx | 75 | Literal Tailwind Color (bg-blue-500) | `<div className="absolute bottom-0 right-0 h-4 w-4 ...` |
| src/components/conversations/ConversationList.tsx | 76 | Literal Tailwind Color (text-white) | `<Bot className="h-2.5 w-2.5 text-white" />` |
| src/components/conversations/ConversationList.tsx | 102 | Literal Tailwind Color (text-white) | `<Badge className="text-[10px] min-w-[18px] h-4.5 p...` |
| src/components/conversations/ConversationsDashboard.tsx | 38 | Literal Tailwind Color (bg-red-100) | `urgent: 'bg-red-100 text-red-700',` |
| src/components/conversations/ConversationsDashboard.tsx | 38 | Literal Tailwind Color (text-red-700) | `urgent: 'bg-red-100 text-red-700',` |
| src/components/conversations/ConversationsDashboard.tsx | 40 | Literal Tailwind Color (bg-blue-100) | `normal: 'bg-blue-100 text-blue-700',` |
| src/components/conversations/ConversationsDashboard.tsx | 40 | Literal Tailwind Color (text-blue-700) | `normal: 'bg-blue-100 text-blue-700',` |
| src/components/conversations/ConversationsDashboard.tsx | 41 | Literal Tailwind Color (bg-gray-100) | `low:    'bg-gray-100 text-gray-600',` |
| src/components/conversations/ConversationsDashboard.tsx | 41 | Literal Tailwind Color (text-gray-600) | `low:    'bg-gray-100 text-gray-600',` |
| src/components/conversations/ConversationsDashboard.tsx | 94 | Literal Tailwind Color (text-blue-600) | `<span className="flex items-center gap-1 text-blue...` |
| src/components/conversations/ConversationsDashboard.tsx | 116 | Literal Tailwind Color (bg-blue-100) | `<div className="h-8 w-8 rounded-full bg-blue-100 f...` |
| src/components/conversations/ConversationsDashboard.tsx | 117 | Literal Tailwind Color (text-blue-600) | `<MessageCircle className="h-4 w-4 text-blue-600" /...` |
| src/components/conversations/ConversationsDashboard.tsx | 184 | Literal Tailwind Color (text-blue-600) | `<p className="font-bold text-lg text-blue-600">{st...` |
| src/components/conversations/ConversationsDashboard.tsx | 197 | Literal Tailwind Color (bg-gray-100) | `<div key={priority} className={`flex items-center ...` |
| src/components/conversations/InboxView.tsx | 103 | Literal Tailwind Color (bg-blue-100) | `<Badge className="text-[10px] bg-blue-100 text-blu...` |
| src/components/conversations/InboxView.tsx | 103 | Literal Tailwind Color (text-blue-700) | `<Badge className="text-[10px] bg-blue-100 text-blu...` |
| src/components/conversations/MessageItem.tsx | 86 | Literal Tailwind Color (bg-white) | `<div className="mb-1 p-2 rounded bg-black/5 dark:b...` |
| src/components/conversations/MessageItem.tsx | 86 | Literal Tailwind Color (bg-black) | `<div className="mb-1 p-2 rounded bg-black/5 dark:b...` |
| src/components/conversations/MessageItem.tsx | 109 | Literal Tailwind Color (text-red-300) | `<AlertCircle className="h-3 w-3 text-red-300" />` |
| src/components/conversations/MessageItem.tsx | 117 | Literal Tailwind Color (text-yellow-400) | `{msg.is_starred && <Star className="h-3 w-3 fill-y...` |
| src/components/conversations/MessageItem.tsx | 142 | Literal Tailwind Color (text-red-300) | `<AlertCircle className="h-3 w-3 text-red-300" />` |
| src/components/conversations/MessageItem.tsx | 172 | Literal Tailwind Color (text-yellow-400) | `<Star className={cn("h-4 w-4", msg.is_starred && "...` |
| src/components/conversations/MessageList.tsx | 226 | Literal Tailwind Color (text-white) | `<span className="absolute -top-1 -right-1 bg-prima...` |
| src/components/csat/CSATWidget.tsx | 28 | Literal Tailwind Color (text-red-600) | `return 'text-red-600';` |
| src/components/csat/CSATWidget.tsx | 129 | Literal Tailwind Color (text-red-600) | `? <TrendingDown className="h-3.5 w-3.5 text-red-60...` |
| src/components/csat/CSATWidget.tsx | 140 | Literal Tailwind Color (text-red-600) | `<span className="text-red-600">👎 {stats.nps_detra...` |
| src/components/csat/CSATWidget.tsx | 150 | Literal Tailwind Color (bg-red-500) | `<div className="bg-red-500" style={{ flex: stats.n...` |
| src/components/csat/CSATWidget.tsx | 166 | Literal Tailwind Color (bg-red-400) | `const color = score >= 9 ? 'bg-primary' : score >=...` |
| src/components/dashboard/ConversationHeatmap.tsx | 68 | Hardcoded Hex Color | `colorScale: ['#f0fdf4', '#86efac', '#22c55e', '#15...` |
| src/components/dashboard/ConversationHeatmap.tsx | 74 | Hardcoded Hex Color | `colorScale: ['#fef9c3', '#fde047', '#facc15', '#ea...` |
| src/components/dashboard/ConversationHeatmap.tsx | 80 | Hardcoded Hex Color | `colorScale: ['#fef2f2', '#fecaca', '#f87171', '#ef...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 104 | Literal Tailwind Color (bg-blue-100) | `{ label: 'Contatos', value: data.contacts.total_ac...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 104 | Literal Tailwind Color (text-blue-600) | `{ label: 'Contatos', value: data.contacts.total_ac...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 107 | Literal Tailwind Color (bg-blue-100) | `{ label: 'Conversas abertas', value: data.conversa...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 107 | Literal Tailwind Color (text-blue-600) | `{ label: 'Conversas abertas', value: data.conversa...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 113 | Literal Tailwind Color (bg-gray-100) | `{ label: 'Webhooks hoje', value: data.webhooks.tot...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 113 | Literal Tailwind Color (text-gray-600) | `{ label: 'Webhooks hoje', value: data.webhooks.tot...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 114 | Literal Tailwind Color (bg-red-100) | `{ label: 'DLQ', value: data.webhooks.dlq_pending.t...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 114 | Literal Tailwind Color (text-red-600) | `{ label: 'DLQ', value: data.webhooks.dlq_pending.t...` |
| src/components/dashboard/PlatformHealthDashboard.tsx | 147 | Literal Tailwind Color (text-red-700) | `<Badge variant="outline" className="text-xs text-r...` |
| src/components/debug/ThemeDebugger.tsx | 34 | Hardcoded Font Family | `'--font-sans',` |
| src/components/debug/ThemeDebugger.tsx | 101 | Hardcoded Font Family | `<div className="space-y-2 font-mono text-[10px]">` |
| src/components/debug/ThemeDebugger.tsx | 108 | Literal Tailwind Color (bg-blue-500) | `data.source === 'css' ? 'bg-blue-500/20 text-blue-...` |
| src/components/debug/ThemeDebugger.tsx | 108 | Literal Tailwind Color (text-blue-500) | `data.source === 'css' ? 'bg-blue-500/20 text-blue-...` |
| src/components/effects/EasterEggs.tsx | 240 | Hardcoded Font Family | `className="absolute text-success font-mono text-sm...` |
| src/components/email/EmailTrackingBadge.tsx | 66 | Literal Tailwind Color (bg-blue-600, bg-blue-700) | `className={`gap-1 bg-blue-600 hover:bg-blue-700 ${...` |
| src/components/email/EmailTrackingDashboard.tsx | 106 | Literal Tailwind Color (text-blue-500) | `<Eye className="h-4 w-4 mx-auto text-blue-500 mb-1...` |
| src/components/email/EmailTrackingDashboard.tsx | 172 | Literal Tailwind Color (text-blue-500) | `<ExternalLink className="h-3.5 w-3.5 text-blue-500...` |
| src/components/email/EmailTrackingDashboard.tsx | 248 | Literal Tailwind Color (text-red-600) | `<p className={`text-2xl font-bold ${stats.open_rat...` |
| src/components/email/EmailTrackingDashboard.tsx | 267 | Literal Tailwind Color (text-blue-500) | `<MousePointerClick className="h-8 w-8 text-blue-50...` |
| src/components/email/EmailTrackingDashboard.tsx | 276 | Literal Tailwind Color (text-red-600) | `<p className={`text-2xl font-bold ${stats.bounce_c...` |
| src/components/email/EmailTrackingDashboard.tsx | 281 | Literal Tailwind Color (text-red-500) | `<AlertTriangle className="h-8 w-8 text-red-500 opa...` |
| src/components/email/OutlookInboxView.tsx | 86 | Literal Tailwind Color (text-blue-500) | `<Building2 className="h-5 w-5 text-blue-500" />` |
| src/components/email/OutlookInboxView.tsx | 150 | Literal Tailwind Color (bg-blue-50, bg-blue-950) | `} ${!msg.isRead ? 'bg-blue-50/50 dark:bg-blue-950/...` |
| src/components/email/OutlookInboxView.tsx | 155 | Literal Tailwind Color (text-blue-500) | `? <Mail className="h-4 w-4 text-blue-500 shrink-0"...` |
| src/components/email/EmailSLADashboard.tsx | 183 | Literal Tailwind Color (text-blue-500) | `color="text-blue-500"` |
| src/components/email/EmailContactPanel.tsx | 28 | Literal Tailwind Color (bg-blue-500) | `const colors = ['bg-blue-500','bg-primary','bg-vio...` |
| src/components/email/EmailContactPanel.tsx | 65 | Literal Tailwind Color (text-white) | `<AvatarFallback className={cn('text-white text-lg ...` |
| src/components/email/EmailContactPanel.tsx | 172 | Literal Tailwind Color (text-white) | `<AvatarFallback className={cn('text-white text-[10...` |
| src/components/email/EmailChatThread.tsx | 63 | Hardcoded Font Family | `<h2 className="font-sans font-bold text-[15px] tex...` |
| src/components/email/EmailChatThread.tsx | 67 | Hardcoded Font Family | `<span className="font-sans text-[11px] text-[hsl(v...` |
| src/components/email/EmailChatThread.tsx | 73 | Hardcoded Font Family | `<span className="font-sans text-[11px] text-[hsl(v...` |
| src/components/email/EmailAttachmentPreview.tsx | 31 | Literal Tailwind Color (text-blue-500) | `if (mimeType.startsWith('image/')) return 'text-bl...` |
| src/components/email/EmailAttachmentPreview.tsx | 33 | Literal Tailwind Color (text-red-500) | `if (mimeType.includes('pdf')) return 'text-red-500...` |
| src/components/email/EmailChatBubble.tsx | 156 | Hardcoded Font Family | `<span className={cn('font-sans text-[16px] truncat...` |
| src/components/email/EmailChatBubble.tsx | 167 | Hardcoded Font Family | `<span className="font-sans text-[10px] font-bold t...` |
| src/components/email/EmailChatBubble.tsx | 181 | Hardcoded Font Family | `<p className="font-sans text-[12px] text-muted-for...` |
| src/components/email/EmailChatBubble.tsx | 185 | Hardcoded Font Family | `<div className="flex items-center gap-1.5 font-san...` |
| src/components/email/EmailChatBubble.tsx | 247 | Hardcoded Font Family | `className="prose prose-sm dark:prose-invert max-w-...` |
| src/components/email/EmailChatBubble.tsx | 252 | Hardcoded Font Family | `<p className="text-[14px] whitespace-pre-wrap lead...` |
| src/components/email/EmailChatReplyBar.tsx | 153 | Hardcoded Font Family | `<span className="shrink-0 font-sans text-[10px] fo...` |
| src/components/email/EmailChatReplyBar.tsx | 154 | Hardcoded Font Family | `<span className="font-sans text-[12px] font-semibo...` |
| src/components/email/EmailChatReplyBar.tsx | 195 | Hardcoded Font Family | `className="min-h-[160px] resize-none border-0 bg-t...` |
| src/components/email/EmailSettingsPage.tsx | 162 | Literal Tailwind Color (text-blue-500) | `<Building2 className="h-5 w-5 text-blue-500" />` |
| src/components/errors/ErrorBoundary.tsx | 156 | Hardcoded Font Family | `<p className="text-destructive font-mono text-xs b...` |
| src/components/gmail/GmailThreadView.tsx | 186 | Literal Tailwind Color (text-yellow-500) | `<Star className={`h-4 w-4 ${thread.is_starred ? 't...` |
| src/components/gmail/GmailAccountSelector.tsx | 83 | Literal Tailwind Color (bg-slate-400) | `(activeStatus === 'loading' || activeStatus === 'd...` |
| src/components/gmail/GmailMetricsDashboard.tsx | 98 | Literal Tailwind Color (text-red-600) | `? 'text-red-600'` |
| src/components/gmail/GmailMetricsDashboard.tsx | 112 | Literal Tailwind Color (text-red-600) | `'text-red-600'` |
| src/components/gmail/GmailMetricsDashboard.tsx | 130 | Literal Tailwind Color (bg-red-500) | `<SLABar label="SLA Violado" value={slaDash.breache...` |
| src/components/gmail/GmailMetricsDashboard.tsx | 131 | Literal Tailwind Color (bg-blue-500) | `<SLABar label="Respondido no prazo" value={slaDash...` |
| src/components/gmail/GmailStatusPanel.tsx | 124 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/components/gmail/GmailInboxView.tsx | 207 | Literal Tailwind Color (bg-blue-50, bg-blue-950) | `${thread.unread_count > 0 ? 'bg-blue-50/30 dark:bg...` |
| src/components/gmail/GmailInboxView.tsx | 215 | Literal Tailwind Color (text-white) | `<div className={`h-8 w-8 rounded-full shrink-0 fle...` |
| src/components/gmail/GmailInboxView.tsx | 248 | Literal Tailwind Color (text-yellow-500) | `className={`p-1 rounded hover:bg-muted ${thread.is...` |
| src/components/integrations/EvolutionApiIntegrationView.tsx | 187 | Hardcoded Font Family | `className="font-mono text-sm"` |
| src/components/integrations/EvolutionApiIntegrationView.tsx | 204 | Hardcoded Font Family | `className="font-mono text-sm pr-10"` |
| src/components/integrations/EvolutionApiIntegrationView.tsx | 239 | Literal Tailwind Color (bg-red-500) | `: 'bg-red-500/5 border-red-500/20'` |
| src/components/integrations/EvolutionApiIntegrationView.tsx | 245 | Literal Tailwind Color (text-red-400) | `<XCircle className="w-4 h-4 text-red-400 mt-0.5 sh...` |
| src/components/integrations/EvolutionApiIntegrationView.tsx | 247 | Literal Tailwind Color (text-red-300) | `<span className={`text-xs ${testResult === 'succes...` |
| src/components/integrations/IntegrationsHub.tsx | 103 | Literal Tailwind Color (text-white) | `<integration.icon className="w-5 h-5 text-white" /...` |
| src/components/knowledge/KnowledgeBaseView.tsx | 126 | Hardcoded Font Family | `<div><Label>Conteúdo *</Label><Textarea value={for...` |
| src/components/layout/AgentProfilePopover.tsx | 63 | Literal Tailwind Color (bg-black) | `<PopoverContent side="right" sideOffset={12} align...` |
| src/components/layout/AppShell.tsx | 129 | Hardcoded Font Family | `<div className="fixed bottom-2 left-2 z-[60] flex ...` |
| src/components/layout/AppShell.tsx | 158 | Literal Tailwind Color (bg-black) | `: 'px-2.5 bg-black border-border/40 text-muted-for...` |
| src/components/layout/ConnectionStatusIndicator.tsx | 314 | Literal Tailwind Color (bg-black) | `<PopoverContent side="right" align="start" classNa...` |
| src/components/layout/Sidebar.tsx | 68 | Hardcoded Font Family | `</TooltipTrigger><TooltipContent side="right" side...` |
| src/components/layout/Sidebar.tsx | 78 | Hardcoded Font Family | `</TooltipTrigger><TooltipContent side="right" side...` |
| src/components/layout/Sidebar.tsx | 101 | Hardcoded Font Family | `{!collapsed && <kbd className="ml-auto px-1 py-0.5...` |
| src/components/layout/Sidebar.tsx | 103 | Hardcoded Font Family | `</TooltipTrigger>{collapsed && <TooltipContent sid...` |
| src/components/layout/SidebarNavItem.tsx | 128 | Hardcoded Font Family | `<kbd className="px-1 py-0.5 rounded bg-muted text-...` |
| src/components/meta-capi/MetaCAPIView.tsx | 150 | Hardcoded Font Family | `<p className="text-sm font-mono truncate">{pixelId...` |
| src/components/monitoring/CrossTabDedupePanel.tsx | 129 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">{shortKey...` |
| src/components/monitoring/DLQAuditHistory.tsx | 60 | Hardcoded Font Family | `<span className="font-mono text-[11px]">` |
| src/components/monitoring/DLQAuditHistory.tsx | 69 | Hardcoded Font Family | `return <span className="font-mono text-[11px] text...` |
| src/components/monitoring/DLQAuditHistory.tsx | 74 | Hardcoded Font Family | `<span className="font-mono text-[11px]">` |
| src/components/monitoring/DLQAuditHistory.tsx | 160 | Hardcoded Font Family | `<code key={id} className="text-[10px] font-mono bg...` |
| src/components/monitoring/DLQAuditHistory.tsx | 169 | Hardcoded Font Family | `<pre className="text-[10px] font-mono bg-backgroun...` |
| src/components/monitoring/DLQPanel.tsx | 151 | Hardcoded Font Family | `'inline-flex items-center gap-1 rounded-full borde...` |
| src/components/monitoring/DLQPanel.tsx | 214 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">{row.inst...` |
| src/components/monitoring/DLQPanel.tsx | 215 | Hardcoded Font Family | `<TableCell className="font-mono text-xs truncate m...` |
| src/components/monitoring/DLQPanel.tsx | 223 | Hardcoded Font Family | `<TableCell className="text-center text-xs font-mon...` |
| src/components/monitoring/DLQPanel.tsx | 259 | Hardcoded Font Family | `<pre className="text-[10px] font-mono bg-backgroun...` |
| src/components/monitoring/DLQPanel.tsx | 265 | Hardcoded Font Family | `<pre className="text-[10px] font-mono bg-backgroun...` |
| src/components/monitoring/DLQPanel.tsx | 269 | Hardcoded Font Family | `Criado em {fmtDate(row.created_at)} · ID <span cla...` |
| src/components/monitoring/MonitoringWebhookPanel.tsx | 105 | Hardcoded Font Family | `Comprimento: <span className="font-mono">{secretSt...` |
| src/components/monitoring/MonitoringWebhookPanel.tsx | 108 | Hardcoded Font Family | `Hash SHA-256: <span className="font-mono">{secretS...` |
| src/components/monitoring/MonitoringWebhookPanel.tsx | 215 | Hardcoded Font Family | `<p className="text-xs font-mono break-all">{webhoo...` |
| src/components/monitoring/RetryAlertsBanner.tsx | 27 | Hardcoded Font Family | `Instância <span className="font-mono">{b.instance}...` |
| src/components/monitoring/RetryAlertsBanner.tsx | 44 | Hardcoded Font Family | `<span className="font-mono">` |
| src/components/monitoring/RetryMetricsPanel.tsx | 305 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">{row.acti...` |
| src/components/monitoring/RetryMetricsPanel.tsx | 316 | Hardcoded Font Family | `<TableCell className="hidden lg:table-cell text-xs...` |
| src/components/monitoring/RetryMetricsPanel.tsx | 320 | Hardcoded Font Family | `<Badge key={i} variant="secondary" className="text...` |
| src/components/monitoring/RetryMetricsPanel.tsx | 344 | Hardcoded Font Family | `<TableCell className="text-right text-xs font-mono...` |
| src/components/monitoring/RetryMetricsPanel.tsx | 353 | Hardcoded Font Family | `<pre className="text-[10px] font-mono bg-backgroun...` |
| src/components/monitoring/RetryMetricsPanel.tsx | 536 | Hardcoded Font Family | `className="flex items-center justify-between gap-3...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 66 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 69 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 72 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 75 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 89 | Hardcoded Font Family | `<p className="font-mono mt-0.5">≤ {formatScheduleM...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 95 | Hardcoded Font Family | `<p className="font-mono mt-0.5">{formatScheduleMs(...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 101 | Hardcoded Font Family | `<p className="font-mono mt-0.5">{formatScheduleMs(...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 120 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">#{a.attem...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 121 | Hardcoded Font Family | `<TableCell className="text-xs font-mono text-muted...` |
| src/components/monitoring/RetrySchedulePreview.tsx | 124 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">` |
| src/components/monitoring/RetrySchedulePreview.tsx | 127 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">` |
| src/components/notifications/NotificationSettingsPanel.tsx | 93 | Hardcoded Font Family | `<Badge variant="secondary" className="font-mono">{...` |
| src/components/notifications/NotificationTypeCards.tsx | 176 | Hardcoded Font Family | `"font-mono",` |
| src/components/notifications/NotificationTypeCards.tsx | 197 | Hardcoded Font Family | `<Badge variant="secondary" className="font-mono">{...` |
| src/components/omnichannel/__tests__/OmnichannelInbox.test.tsx | 97 | Literal Tailwind Color (text-blue-400) | `telegram: { label: 'Telegram', color: 'text-blue-4...` |
| src/components/omnichannel/__tests__/OmnichannelInbox.test.tsx | 98 | Literal Tailwind Color (text-blue-600) | `messenger: { label: 'Messenger', color: 'text-blue...` |
| src/components/omnichannel/__tests__/OmnichannelInbox.test.tsx | 99 | Literal Tailwind Color (text-yellow-500) | `email: { label: 'Email', color: 'text-yellow-500' ...` |
| src/components/queues/CreateQueueDialog.tsx | 21 | Hardcoded Hex Color | `'#3B82F6', // blue` |
| src/components/queues/CreateQueueDialog.tsx | 22 | Hardcoded Hex Color | `'#10B981', // green` |
| src/components/queues/CreateQueueDialog.tsx | 23 | Hardcoded Hex Color | `'#F59E0B', // amber` |
| src/components/queues/CreateQueueDialog.tsx | 24 | Hardcoded Hex Color | `'#EF4444', // red` |
| src/components/queues/CreateQueueDialog.tsx | 25 | Hardcoded Hex Color | `'#8B5CF6', // purple` |
| src/components/queues/CreateQueueDialog.tsx | 26 | Hardcoded Hex Color | `'#EC4899', // pink` |
| src/components/queues/CreateQueueDialog.tsx | 27 | Hardcoded Hex Color | `'#06B6D4', // cyan` |
| src/components/queues/CreateQueueDialog.tsx | 28 | Hardcoded Hex Color | `'#84CC16', // lime` |
| src/components/security/BlockedIPDialogs.tsx | 87 | Hardcoded Font Family | `<AlertDialogDescription>O IP <code className="font...` |
| src/components/security/BlockedIPsPanel.tsx | 64 | Hardcoded Font Family | `<code className="font-mono font-medium">{ip.ip_add...` |
| src/components/security/IPWhitelistPanel.tsx | 195 | Hardcoded Font Family | `<code className="font-mono font-medium">{ip.ip_add...` |
| src/components/security/IPWhitelistPanel.tsx | 273 | Hardcoded Font Family | `O IP <code className="font-mono">{ipToRemove?.ip_a...` |
| src/components/security/RateLimitConfigPanel.tsx | 195 | Hardcoded Font Family | `className="h-8 text-xs font-mono"` |
| src/components/security/RateLimitRealtimeAlerts.tsx | 138 | Hardcoded Font Family | `<code className="font-mono">{alert.ip_address}</co...` |
| src/components/security/VirusTotalConfig.tsx | 73 | Hardcoded Font Family | `className="font-mono"` |
| src/components/security/VirusTotalConfig.tsx | 86 | Literal Tailwind Color (bg-red-50) | `<div className={`p-4 rounded-lg flex items-start g...` |
| src/components/security/VirusTotalConfig.tsx | 86 | Literal Tailwind Color (text-red-700) | `<div className={`p-4 rounded-lg flex items-start g...` |
| src/components/security/VirusTotalConfig.tsx | 96 | Literal Tailwind Color (bg-slate-50) | `<div className="text-xs text-muted-foreground bg-s...` |
| src/components/security/VirusTotalConfig.tsx | 99 | Literal Tailwind Color (bg-slate-200) | `<code className="block mt-1 p-1 bg-slate-200 round...` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 83 | Literal Tailwind Color (bg-blue-500) | `create: 'bg-blue-500/10 text-blue-500',` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 83 | Literal Tailwind Color (text-blue-500) | `create: 'bg-blue-500/10 text-blue-500',` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 84 | Literal Tailwind Color (bg-yellow-500) | `update: 'bg-yellow-500/10 text-yellow-500',` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 84 | Literal Tailwind Color (text-yellow-500) | `update: 'bg-yellow-500/10 text-yellow-500',` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 89 | Literal Tailwind Color (bg-yellow-500) | `password_change: 'bg-yellow-500/10 text-yellow-500...` |
| src/components/security/__tests__/AuditLogDashboard.test.tsx | 89 | Literal Tailwind Color (text-yellow-500) | `password_change: 'bg-yellow-500/10 text-yellow-500...` |
| src/components/settings/ConnectionTestPanel.tsx | 117 | Hardcoded Font Family | `<span className="font-mono truncate max-w-[260px]"...` |
| src/components/settings/IntegrationKeysSection.tsx | 192 | Hardcoded Font Family | `className="h-8 text-sm font-mono bg-muted/30"` |
| src/components/settings/IntegrationKeysSection.tsx | 264 | Hardcoded Font Family | `<p className="font-mono text-xs">{testResult.detai...` |
| src/components/settings/IntegrationKeysSection.tsx | 268 | Hardcoded Font Family | `<p className="font-mono text-xs">{testResult.detai...` |
| src/components/settings/IntegrationKeysSection.tsx | 272 | Hardcoded Font Family | `<p className="font-mono text-xs">{testResult.detai...` |
| src/components/settings/IntegrationKeysSection.tsx | 276 | Hardcoded Font Family | `<p className="font-mono text-xs text-success">Habi...` |
| src/components/settings/IntegrationKeysSection.tsx | 301 | Hardcoded Font Family | `<span className="text-[10px] text-muted-foreground...` |
| src/components/settings/SLASettings.tsx | 49 | Literal Tailwind Color (text-red-500) | `<ShieldAlert className="w-4 h-4 text-red-500" />` |
| src/components/settings/ai-providers/AIProviderCard.tsx | 70 | Hardcoded Font Family | `<span className="text-xs text-muted-foreground ml-...` |
| src/components/settings/ai-providers/AIProviderFormDialog.tsx | 134 | Hardcoded Font Family | `className="rounded-xl font-mono text-sm"` |
| src/components/settings/ai-providers/AIProviderFormDialog.tsx | 149 | Hardcoded Font Family | `className="rounded-xl font-mono text-sm"` |
| src/components/settings/ai-providers/AIProviderHealthPanel.tsx | 170 | Hardcoded Font Family | `<span className="font-mono text-[10px] text-muted-...` |
| src/components/settings/sla/SLARuleRow.tsx | 56 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/components/settings/theme/BorderRadiusControl.tsx | 19 | Hardcoded Font Family | `<span className="text-xs font-mono text-muted-fore...` |
| src/components/settings/theme/BorderRadiusControl.tsx | 27 | Hardcoded Font Family | `<span className="text-[10px] text-muted-foreground...` |
| src/components/settings/theme/BorderRadiusControl.tsx | 36 | Hardcoded Font Family | `<span className="text-[10px] text-muted-foreground...` |
| src/components/settings/theme/ThemeDebugTooltip.tsx | 18 | Hardcoded Font Family | `<div className="flex items-center gap-1.5 px-2 py-...` |
| src/components/settings/theme/ThemeDebugTooltip.tsx | 23 | Hardcoded Font Family | `<TooltipContent side="bottom" className="w-64 p-3 ...` |
| src/components/settings/theme/__tests__/fontPreservation.test.tsx | 36 | Hardcoded Font Family | `expect(root.style.getPropertyValue('--font-sans'))...` |
| src/components/settings/theme/__tests__/fontPreservation.test.tsx | 51 | Hardcoded Font Family | `expect(root.style.getPropertyValue('--font-sans'))...` |
| src/components/settings/theme/__tests__/fontPreservation.test.tsx | 65 | Hardcoded Font Family | `expect(document.documentElement.style.getPropertyV...` |
| src/components/settings/theme/__tests__/fontPreservation.test.tsx | 72 | Hardcoded Font Family | `expect(document.documentElement.style.getPropertyV...` |
| src/components/settings/theme/__tests__/fontPreservation.test.tsx | 82 | Hardcoded Font Family | `expect(document.documentElement.style.getPropertyV...` |
| src/components/settings/theme/__tests__/gxPresets.test.ts | 119 | Hardcoded Hex Color | `describe('Passo A — surface palette dark roxa (#25...` |
| src/components/settings/theme/__tests__/gxPresets.test.ts | 315 | Hardcoded Hex Color | `it('foreground dark dos skins não-GX permanece em ...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 92 | Hardcoded Font Family | `it('aplica --font-sans com Rajdhani ao selecionar ...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 99 | Hardcoded Font Family | `expect(root().style.getPropertyValue('--font-sans'...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 109 | Hardcoded Font Family | `expect(root().style.getPropertyValue('--font-sans'...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 114 | Hardcoded Font Family | `expect(root().style.getPropertyValue('--font-sans'...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 124 | Hardcoded Font Family | `const a = root().style.getPropertyValue('--font-sa...` |
| src/components/settings/theme/__tests__/useThemePreset.gx.test.tsx | 129 | Hardcoded Font Family | `const b = root().style.getPropertyValue('--font-sa...` |
| src/components/settings/theme/useThemePreset.ts | 42 | Hardcoded Font Family | `const currentComputed = getComputedStyle(root).get...` |
| src/components/settings/theme/useThemePreset.ts | 44 | Hardcoded Font Family | `root.style.setProperty('--font-sans', preset.font)...` |
| src/components/settings/theme/useThemePreset.ts | 49 | Hardcoded Font Family | `if (root.style.getPropertyValue('--font-sans')) {` |
| src/components/settings/theme/useThemePreset.ts | 50 | Hardcoded Font Family | `root.style.removeProperty('--font-sans');` |
| src/components/settings/theme/useThemePreset.ts | 152 | Hardcoded Font Family | `root.style.removeProperty('--font-sans');` |
| src/components/sla/SLADashboard.tsx | 32 | Literal Tailwind Color (text-red-600) | `return 'text-red-600';` |
| src/components/sla/SLADashboard.tsx | 38 | Literal Tailwind Color (bg-red-500) | `return 'bg-red-500';` |
| src/components/sla/SLADashboard.tsx | 136 | Literal Tailwind Color (bg-red-50) | `<Alert className="border-red-200 bg-red-50">` |
| src/components/sla/SLADashboard.tsx | 137 | Literal Tailwind Color (text-red-600) | `<AlertTriangle className="h-4 w-4 text-red-600" />` |
| src/components/sla/SLADashboard.tsx | 138 | Literal Tailwind Color (text-red-800) | `<AlertDescription className="text-sm text-red-800"...` |
| src/components/sla/SLADashboard.tsx | 149 | Literal Tailwind Color (text-red-600) | `<p className={`text-xl font-bold ${stats.first_res...` |
| src/components/sla/SLADashboard.tsx | 157 | Literal Tailwind Color (text-red-600) | `<p className={`text-xl font-bold ${stats.resolutio...` |
| src/components/tags/TagsView.tsx | 40 | Hardcoded Hex Color | `'#ef4444', // red` |
| src/components/tags/TagsView.tsx | 41 | Hardcoded Hex Color | `'#f97316', // orange` |
| src/components/tags/TagsView.tsx | 42 | Hardcoded Hex Color | `'#eab308', // yellow` |
| src/components/tags/TagsView.tsx | 43 | Hardcoded Hex Color | `'#22c55e', // green` |
| src/components/tags/TagsView.tsx | 44 | Hardcoded Hex Color | `'#06b6d4', // cyan` |
| src/components/tags/TagsView.tsx | 45 | Hardcoded Hex Color | `'#3b82f6', // blue` |
| src/components/tags/TagsView.tsx | 46 | Hardcoded Hex Color | `'#8b5cf6', // violet` |
| src/components/tags/TagsView.tsx | 47 | Hardcoded Hex Color | `'#ec4899', // pink` |
| src/components/tags/TagsView.tsx | 48 | Hardcoded Hex Color | `'#6b7280', // gray` |
| src/components/talkx/TalkXAnalytics.tsx | 70 | Hardcoded Hex Color | `'#f59e0b',` |
| src/components/talkx/TalkXAnalytics.tsx | 71 | Hardcoded Hex Color | `'#6366f1',` |
| src/components/talkx/TalkXCampaignEditor.tsx | 79 | Hardcoded Font Family | `<TooltipContent side="top" className="max-w-[200px...` |
| src/components/talkx/TalkXCampaignEditor.tsx | 93 | Hardcoded Font Family | `<Textarea value={ed.messageTemplate} onChange={(e)...` |
| src/components/talkx/TalkXCampaignEditor.tsx | 150 | Hardcoded Font Family | `<div className="flex justify-between mb-3"><Label>...` |
| src/components/talkx/TalkXCampaignEditor.tsx | 156 | Hardcoded Font Family | `<div className="flex justify-between mb-3"><Label>...` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 347 | Literal Tailwind Color (text-green-500) | `<Globe className="w-5 h-5 text-green-500" />` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 362 | Literal Tailwind Color (text-blue-500) | `<Shield className="w-5 h-5 text-blue-500" />` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 416 | Literal Tailwind Color (bg-yellow-500) | `<div className="rounded-xl border border-yellow-50...` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 417 | Literal Tailwind Color (text-yellow-500) | `<AlertTriangle className="w-5 h-5 text-yellow-500 ...` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 419 | Literal Tailwind Color (text-yellow-700) | `<p className="text-xs font-bold text-yellow-700">A...` |
| src/components/team-chat/DepartmentManagementDialog.tsx | 420 | Literal Tailwind Color (text-yellow-600) | `<p className="text-[10px] text-yellow-600 leading-...` |
| src/components/team-chat/ParticipantStatsGraph.tsx | 120 | Hardcoded Hex Color | `<Bar dataKey="sent" name="Enviadas" fill="#8884d8"...` |
| src/components/team-chat/ParticipantStatsGraph.tsx | 121 | Hardcoded Hex Color | `<Bar dataKey="delivered" name="Entregues" fill="#8...` |
| src/components/team-chat/ParticipantStatsGraph.tsx | 122 | Hardcoded Hex Color | `<Bar dataKey="read" name="Lidas" fill="#ffc658" ra...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 82 | Literal Tailwind Color (text-green-500) | `<p className="text-[10px] text-green-500 font-medi...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 94 | Literal Tailwind Color (text-green-500) | `<p className="text-[10px] text-green-500 font-medi...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 106 | Literal Tailwind Color (text-green-500) | `<p className={avgRender > 16 ? "text-[10px] text-y...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 106 | Literal Tailwind Color (text-yellow-500) | `<p className={avgRender > 16 ? "text-[10px] text-y...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 155 | Literal Tailwind Color (bg-black) | `<div className="bg-black/20 rounded-lg p-3 font-mo...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 155 | Hardcoded Font Family | `<div className="bg-black/20 rounded-lg p-3 font-mo...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 156 | Literal Tailwind Color (text-blue-400) | `<p className="text-blue-400">[INFO] {format(new Da...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 157 | Literal Tailwind Color (text-green-400) | `<p className="text-green-400">[SUCCESS] {format(ne...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 158 | Literal Tailwind Color (text-yellow-400) | `<p className="text-yellow-400">[WARN] {format(new ...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 159 | Literal Tailwind Color (text-blue-400) | `<p className="text-blue-400">[INFO] {format(new Da...` |
| src/components/team-chat/TeamPerformancePanel.tsx | 160 | Literal Tailwind Color (text-blue-400) | `<p className="text-blue-400">[INFO] {format(new Da...` |
| src/components/ui/micro-interactions/buttons.tsx | 255 | Hardcoded Hex Color | `mask: 'linear-gradient(#fff 0 0) content-box, line...` |
| src/components/ui/badge.tsx | 19 | Hardcoded Hex Color | `whatsapp: "border-transparent bg-[#25D366] text-wh...` |
| src/components/ui/badge.tsx | 19 | Literal Tailwind Color (text-white) | `whatsapp: "border-transparent bg-[#25D366] text-wh...` |
| src/components/ui/badge.tsx | 20 | Hardcoded Hex Color | `glowPurple: "border-transparent bg-[#8B5CF6] text-...` |
| src/components/ui/badge.tsx | 20 | Literal Tailwind Color (text-white) | `glowPurple: "border-transparent bg-[#8B5CF6] text-...` |
| src/components/ui/chart.tsx | 48 | Hardcoded Hex Color | `"flex aspect-video justify-center text-xs [&_.rech...` |
| src/components/ui/chart.tsx | 212 | Hardcoded Font Family | `<span className="font-mono font-medium tabular-num...` |
| src/components/ui/command-palette.tsx | 115 | Hardcoded Font Family | `<span className="flex items-center gap-1"><kbd cla...` |
| src/components/ui/command-palette.tsx | 116 | Hardcoded Font Family | `<span className="flex items-center gap-1"><kbd cla...` |
| src/components/ui/command-palette.tsx | 117 | Hardcoded Font Family | `<span className="flex items-center gap-1"><kbd cla...` |
| src/components/ui/command-palette.tsx | 119 | Hardcoded Font Family | `<div className="flex items-center gap-1"><Command ...` |
| src/components/ui/command-palette.tsx | 151 | Hardcoded Font Family | `{cmd.shortcut && <div className="flex gap-1">{cmd....` |
| src/components/ui/command-palette.tsx | 182 | Hardcoded Font Family | `{item.shortcut && <div className="flex gap-1">{ite...` |
| src/components/ui/phone-input.tsx | 118 | Hardcoded Font Family | `className={cn('font-mono tracking-wide', className...` |
| src/components/ui/scroll-area.tsx | 33 | Literal Tailwind Color (bg-white) | `<ScrollAreaPrimitive.ScrollAreaThumb className="re...` |
| src/components/ui/skeleton.tsx | 6 | Literal Tailwind Color (bg-white) | `"rounded-md bg-white/[0.03] relative overflow-hidd...` |
| src/components/ui/skeleton.tsx | 11 | Literal Tailwind Color (bg-white) | `shimmer: "bg-white/[0.03] before:absolute before:i...` |
| src/components/ui/skeleton.tsx | 12 | Literal Tailwind Color (bg-white) | `wave: "bg-white/[0.03] after:absolute after:inset-...` |
| src/components/ui/skip-link.tsx | 91 | Hardcoded Font Family | `Pressione <kbd className="px-1.5 py-0.5 bg-backgro...` |
| src/components/ui/switch.tsx | 20 | Literal Tailwind Color (bg-white) | `"pointer-events-none block h-5 w-5 rounded-full bg...` |
| src/components/ui/tooltip.tsx | 78 | Hardcoded Font Family | `<kbd className="ml-auto pointer-events-none inline...` |
| src/components/ui/stories/Card.stories.tsx | 68 | Literal Tailwind Color (text-white) | `<CardTitle className="text-white">OLED Glass Card<...` |
| src/components/ui/stories/Card.stories.tsx | 69 | Literal Tailwind Color (text-white) | `<CardDescription className="text-white/70">Backdro...` |
| src/components/ui/stories/Card.stories.tsx | 71 | Literal Tailwind Color (text-white) | `<CardContent className="text-white/90">` |
| src/components/voice/ElevenLabsDialogue.tsx | 111 | Hardcoded Font Family | `<div className="flex items-center gap-1 text-xs te...` |
| src/components/voice/VoiceOrb.tsx | 144 | Literal Tailwind Color (text-white) | `<Mic className="w-6 h-6 text-white/60 drop-shadow-...` |
| src/components/voice/VoiceOrb.tsx | 147 | Literal Tailwind Color (text-white) | `<Loader2 className="w-6 h-6 text-white animate-spi...` |
| src/components/voice/VoiceOrb.tsx | 154 | Literal Tailwind Color (text-white) | `<Mic className="w-6 h-6 text-white drop-shadow-lg"...` |
| src/components/voice/VoiceOrb.tsx | 162 | Literal Tailwind Color (text-white) | `<Zap className="w-6 h-6 text-white drop-shadow-lg"...` |
| src/components/voice/VoiceOrb.tsx | 170 | Literal Tailwind Color (text-white) | `<Volume2 className="w-6 h-6 text-white drop-shadow...` |
| src/components/voice/VoiceSearchOverlay.tsx | 132 | Hardcoded Font Family | `<span className="text-[10px] text-muted-foreground...` |
| src/components/voice/VoiceSuggestions.tsx | 27 | Literal Tailwind Color (text-white) | `<p className="text-[10px] text-white/25 text-cente...` |
| src/components/voice/VoiceSuggestions.tsx | 37 | Literal Tailwind Color (bg-white, bg-white) | `className="text-xs text-white/35 px-4 py-1.5 round...` |
| src/components/voice/VoiceSuggestions.tsx | 37 | Literal Tailwind Color (text-white, text-white) | `className="text-xs text-white/35 px-4 py-1.5 round...` |
| src/components/whatsapp-flows/WhatsAppProviderConfig.tsx | 129 | Literal Tailwind Color (text-yellow-500) | `<li className="flex items-center gap-2"><AlertCirc...` |
| src/components/whatsapp-flows/WhatsAppProviderConfig.tsx | 153 | Literal Tailwind Color (text-blue-500) | `<li className="flex items-center gap-2"><AlertCirc...` |
| src/features/admin/components/AIUsageDashboard.tsx | 86 | Hardcoded Hex Color | `<PieChart><Pie data={functionUsage} dataKey="token...` |
| src/features/admin/components/AIUsageDashboard.tsx | 91 | Hardcoded Hex Color | `<div className="flex items-center gap-1.5"><div cl...` |
| src/features/admin/components/AIUsageLogsTab.tsx | 53 | Hardcoded Hex Color | `<Badge variant="secondary" className="text-[10px]"...` |
| src/features/admin/components/AIUsageLogsTab.tsx | 58 | Hardcoded Font Family | `<td className="px-3 py-2 text-right font-mono text...` |
| src/features/admin/components/AdminCRMDashboard.tsx | 76 | Hardcoded Font Family | `<span className="text-muted-foreground font-mono w...` |
| src/features/admin/components/FailedMessageTableRow.tsx | 85 | Hardcoded Font Family | `<TableCell className="font-mono text-xs" data-test...` |
| src/features/admin/components/FailedMessageTableRow.tsx | 86 | Hardcoded Font Family | `<TableCell className="font-mono text-xs" data-test...` |
| src/features/admin/components/MediaMigrationTool.tsx | 146 | Hardcoded Font Family | `<p key={i} className="text-xs font-mono py-0.5">` |
| src/features/admin/components/PublicApiDashboard.tsx | 120 | Hardcoded Font Family | `<Input readOnly value={showToken ? apiToken : '•'....` |
| src/features/admin/components/PublicApiDashboard.tsx | 136 | Hardcoded Font Family | `className="font-mono text-xs"` |
| src/features/admin/components/PublicApiDashboard.tsx | 158 | Hardcoded Font Family | `<div className="bg-muted/50 rounded-lg p-4 font-mo...` |
| src/features/admin/components/RetryConfigPanel.tsx | 209 | Hardcoded Font Family | `<div className="font-mono text-muted-foreground">{...` |
| src/features/admin/components/SicoobBridgeDashboard.tsx | 131 | Hardcoded Font Family | `<div className="bg-muted/50 rounded-lg p-3 font-mo...` |
| src/features/admin/components/SicoobBridgeDashboard.tsx | 135 | Hardcoded Font Family | `<div className="bg-muted/50 rounded-lg p-3 font-mo...` |
| src/features/admin/components/SicoobBridgeDashboard.tsx | 209 | Hardcoded Font Family | `<td className="p-2 font-mono">{m.sicoob_singular_i...` |
| src/features/admin/components/instance-pauses/AuthEventTrendChart.tsx | 242 | Hardcoded Font Family | `<td className="py-2 pr-4 font-mono text-xs">{row.i...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 122 | Hardcoded Font Family | `Incidente de autenticação — <span className="font-...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 150 | Hardcoded Font Family | `<div className="mt-1 text-xl font-bold font-mono">...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 204 | Hardcoded Font Family | `{reasonLabel[k as keyof typeof reasonLabel] ?? k}:...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 209 | Hardcoded Font Family | `<Globe className="h-3 w-3" />{k}: <span className=...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 257 | Hardcoded Font Family | `<td className="px-2 py-1.5 font-mono">{ev.http_sta...` |
| src/features/admin/components/instance-pauses/IncidentDetailDialog.tsx | 258 | Hardcoded Font Family | `<td className="px-2 py-1.5 font-mono truncate max-...` |
| src/features/admin/components/GmailWebhookMonitor.tsx | 180 | Hardcoded Font Family | `<div className="bg-muted/50 rounded-lg p-4 font-mo...` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 33 | Hardcoded Hex Color | `'ai-suggest-reply': '#3b82f6',` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 34 | Hardcoded Hex Color | `'ai-enhance-message': '#8b5cf6',` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 35 | Hardcoded Hex Color | `'ai-conversation-analysis': '#f59e0b',` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 36 | Hardcoded Hex Color | `'ai-conversation-summary': '#10b981',` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 37 | Hardcoded Hex Color | `'ai-auto-tag': '#ef4444',` |
| src/features/admin/hooks/useAIUsageDashboard.ts | 38 | Hardcoded Hex Color | `'chatbot-l1': '#06b6d4',` |
| src/features/auth/components/PreviewPreconditionBanner.tsx | 47 | Literal Tailwind Color (bg-black) | `className="fixed top-2 left-1/2 -translate-x-1/2 z...` |
| src/features/auth/components/mfa/MFABackupCodes.tsx | 82 | Hardcoded Font Family | `className="font-mono text-sm px-3 py-1.5 bg-backgr...` |
| src/features/auth/components/mfa/MFAEnroll.tsx | 135 | Hardcoded Font Family | `<code className="flex-1 p-2 bg-muted rounded text-...` |
| src/features/auth/components/mfa/MFAEnroll.tsx | 172 | Hardcoded Font Family | `className="text-center text-2xl tracking-widest fo...` |
| src/features/auth/components/mfa/MFAVerify.tsx | 89 | Hardcoded Font Family | `className={`text-center text-2xl tracking-widest f...` |
| src/features/connections/components/WhatsAppConnectionStatus.tsx | 36 | Literal Tailwind Color (bg-red-500, bg-red-500) | `className="h-5 px-1.5 border-red-500/20 bg-red-500...` |
| src/features/connections/components/WhatsAppConnectionStatus.tsx | 36 | Literal Tailwind Color (text-red-500) | `className="h-5 px-1.5 border-red-500/20 bg-red-500...` |
| src/features/inbox/components/AudioRecorder.tsx | 348 | Hardcoded Font Family | `"text-lg font-mono font-black tabular-nums trackin...` |
| src/features/inbox/components/AudioRecorder.tsx | 395 | Hardcoded Font Family | `<span className="text-xs font-mono font-bold text-...` |
| src/features/inbox/components/AudioRecorder.tsx | 457 | Hardcoded Font Family | `<span className="text-xs font-mono font-bold text-...` |
| src/features/inbox/components/BulkActionsToolbar.tsx | 124 | Hardcoded Font Family | `<kbd className="text-[10px] px-1 py-0.5 bg-muted/5...` |
| src/features/inbox/components/ChatPanel.tsx | 415 | Literal Tailwind Color (bg-black) | `<div className="absolute inset-0 z-50 bg-black/80 ...` |
| src/features/inbox/components/ContactDetails.tsx | 109 | Hardcoded Font Family | `className="w-80 h-full min-h-0 shrink-0 bg-backgro...` |
| src/features/inbox/components/ConversationContextMenu.tsx | 93 | Literal Tailwind Color (bg-black) | `<ContextMenuContent className="w-56 bg-black borde...` |
| src/features/inbox/components/ConversationContextMenu.tsx | 183 | Literal Tailwind Color (bg-black) | `<ContextMenuSubContent className="w-40 bg-black bo...` |
| src/features/inbox/components/ConversationContextMenu.tsx | 214 | Literal Tailwind Color (bg-black) | `<ContextMenuSubContent className="w-48 bg-black bo...` |
| src/features/inbox/components/ConversationHealth.tsx | 122 | Hardcoded Font Family | `<span className="text-xs font-mono">{metrics.detai...` |
| src/features/inbox/components/ConversationHealth.tsx | 126 | Hardcoded Font Family | `<span className="text-xs font-mono">{metrics.detai...` |
| src/features/inbox/components/ConversationHealth.tsx | 130 | Hardcoded Font Family | `<span className={cn("text-xs font-mono", metrics.d...` |
| src/features/inbox/components/ConversationList.tsx | 77 | Hardcoded Font Family | `<div className="flex flex-col h-full bg-background...` |
| src/features/inbox/components/ConversationListSidebar.tsx | 141 | Hardcoded Font Family | `"font-extrabold text-foreground tracking-tight fon...` |
| src/features/inbox/components/ConversationListSidebar.tsx | 219 | Hardcoded Font Family | `"pl-9 pr-8 bg-muted/40 hover:bg-muted/60 focus:bg-...` |
| src/features/inbox/components/ConversationListSidebar.tsx | 232 | Hardcoded Font Family | `<kbd className="h-4 px-1 rounded bg-muted text-[9p...` |
| src/features/inbox/components/ConversationListSidebar.tsx | 248 | Literal Tailwind Color (text-white) | `? 'bg-orange-500 text-white hover:bg-orange-600'` |
| src/features/inbox/components/ConversationListSidebar.tsx | 257 | Literal Tailwind Color (text-white) | `className="absolute -top-0.5 -right-0.5 min-w-[14p...` |
| src/features/inbox/components/GlobalSearch.tsx | 112 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 bg-muted rounded tex...` |
| src/features/inbox/components/GlobalSearch.tsx | 114 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 bg-muted rounded tex...` |
| src/features/inbox/components/GlobalSearch.tsx | 118 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 bg-muted rounded tex...` |
| src/features/inbox/components/GlobalSearch.tsx | 120 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 bg-muted rounded tex...` |
| src/features/inbox/components/InboxEmptyChat.tsx | 37 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded-md bg-muted ...` |
| src/features/inbox/components/InboxEmptyChat.tsx | 38 | Hardcoded Font Family | `<kbd className="px-1.5 py-0.5 rounded-md bg-muted ...` |
| src/features/inbox/components/InboxEmptyChat.tsx | 43 | Hardcoded Font Family | `<kbd className="px-2 py-0.5 rounded-md bg-muted te...` |
| src/features/inbox/components/InboxEmptyChat.tsx | 48 | Hardcoded Font Family | `<kbd className="px-2 py-0.5 rounded-md bg-muted te...` |
| src/features/inbox/components/LocationMessage.tsx | 144 | Hardcoded Font Family | `"text-[10px] font-mono",` |
| src/features/inbox/components/LocationPicker.tsx | 70 | Hardcoded Font Family | `<p className="text-[10px] font-mono text-muted-for...` |
| src/features/inbox/components/MediaPreview.tsx | 16 | Hardcoded Hex Color | `if (['pdf'].includes(extension)) return <FileText ...` |
| src/features/inbox/components/MediaPreview.tsx | 17 | Hardcoded Hex Color | `if (['doc', 'docx'].includes(extension)) return <F...` |
| src/features/inbox/components/MediaPreview.tsx | 18 | Hardcoded Hex Color | `if (['xls', 'xlsx'].includes(extension)) return <F...` |
| src/features/inbox/components/MediaPreview.tsx | 19 | Hardcoded Hex Color | `if (['ppt', 'pptx'].includes(extension)) return <F...` |
| src/features/inbox/components/MediaPreview.tsx | 20 | Hardcoded Hex Color | `if (['zip', 'rar', '7z'].includes(extension)) retu...` |
| src/features/inbox/components/MediaPreview.tsx | 71 | Literal Tailwind Color (bg-white) | `className="flex-shrink-0 w-8 h-8 rounded-full flex...` |
| src/features/inbox/components/MessagePreview.tsx | 136 | Hardcoded Font Family | `<code key={index} className="px-1 py-0.5 bg-primar...` |
| src/features/inbox/components/SLAIndicatorForContact.tsx | 142 | Literal Tailwind Color (bg-black) | `<TooltipContent side="bottom" className="max-w-xs ...` |
| src/features/inbox/components/SlashCommands.tsx | 124 | Hardcoded Font Family | `<code className="text-[10px] px-1.5 py-0.5 bg-mute...` |
| src/features/inbox/components/TeamFiles.tsx | 168 | Hardcoded Font Family | `<p className="text-[9px] text-amber-600/60 font-mo...` |
| src/features/inbox/components/TemplatesWithVariables.tsx | 23 | Hardcoded Font Family | `return <Badge key={index} variant="secondary" clas...` |
| src/features/inbox/components/TemplatesWithVariables.tsx | 97 | Hardcoded Font Family | `{template.shortcut && <Badge variant="outline" cla...` |
| src/features/inbox/components/ThreadSLASettingsDialog.tsx | 75 | Literal Tailwind Color (bg-black) | `<DialogContent className="sm:max-w-[425px] bg-blac...` |
| src/features/inbox/components/ThreadSLASettingsDialog.tsx | 112 | Literal Tailwind Color (text-red-500) | `<ShieldAlert className="w-3 h-3 text-red-500" />` |
| src/features/inbox/components/TicketTabs.tsx | 103 | Literal Tailwind Color (text-white) | `activeColor: 'bg-orange-500 text-white',` |
| src/features/inbox/components/TicketTabs.tsx | 134 | Hardcoded Font Family | `"flex items-center gap-1 bg-muted/30 dark:bg-muted...` |
| src/features/inbox/components/TicketTabs.tsx | 160 | Literal Tailwind Color (bg-white) | `? 'bg-white/20 text-white'` |
| src/features/inbox/components/TicketTabs.tsx | 160 | Literal Tailwind Color (text-white) | `? 'bg-white/20 text-white'` |
| src/features/inbox/components/TicketTabs.tsx | 170 | Literal Tailwind Color (bg-white) | `className="absolute inset-0 bg-white/5 pointer-eve...` |
| src/features/inbox/components/TicketTabs.tsx | 195 | Hardcoded Font Family | `'flex items-center gap-2 font-bold transition-all ...` |
| src/features/inbox/components/VisualValidationChecklist.tsx | 19 | Hardcoded Font Family | `{ id: 'font-inter', category: 'font', label: 'Font...` |
| src/features/inbox/components/VisualValidationChecklist.tsx | 36 | Hardcoded Font Family | `if (item.id === 'font-inter') return { ...item, is...` |
| src/features/inbox/components/VisualValidationChecklist.tsx | 71 | Hardcoded Font Family | `className="fixed right-0 top-0 bottom-0 w-[380px] ...` |
| src/features/inbox/components/VoiceChanger.tsx | 255 | Hardcoded Font Family | `<span className="text-[10px] font-mono text-primar...` |
| src/features/inbox/components/WhisperMode.tsx | 342 | Literal Tailwind Color (text-white) | `className="h-9 w-9 shrink-0 rounded-xl bg-amber-50...` |
| src/features/inbox/components/__tests__/ChatVisualRegression.test.tsx | 128 | Literal Tailwind Color (bg-black) | `expect(container.querySelector('.bg-black')).toBeF...` |
| src/features/inbox/components/agents-ops/AgentRecentSendsPopover.tsx | 72 | Hardcoded Font Family | `<span className="text-xs font-mono text-muted-fore...` |
| src/features/inbox/components/agents-ops/AgentRecentSendsPopover.tsx | 91 | Hardcoded Font Family | `'flex items-center gap-1 rounded px-1.5 py-0.5 tex...` |
| src/features/inbox/components/agents-ops/AgentRecentSendsPopover.tsx | 101 | Hardcoded Font Family | `<p className="text-xs font-mono">{s.idem_key}</p>` |
| src/features/inbox/components/agents-ops/__tests__/AgentOpsTable.test.tsx | 25 | Hardcoded Hex Color | `queues: [{ id: 'q1', name: 'Vendas', color: '#3b82...` |
| src/features/inbox/components/ai-tools/ToolPanel.tsx | 30 | Literal Tailwind Color (bg-black) | `className="absolute inset-0 z-20 bg-black/50 backd...` |
| src/features/inbox/components/chat/ChatHeader.tsx | 112 | Hardcoded Font Family | `<h3 className="font-sans font-semibold text-[15px]...` |
| src/features/inbox/components/chat/ChatHeader.tsx | 127 | Hardcoded Font Family | `<span className="font-sans text-[11px] text-primar...` |
| src/features/inbox/components/chat/ChatHeader.tsx | 131 | Hardcoded Font Family | `<span className="font-sans text-[11px] text-[hsl(v...` |
| src/features/inbox/components/chat/ChatHeader.tsx | 189 | Literal Tailwind Color (text-white) | `<span className="absolute -top-1.5 -right-1.5 h-3....` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 188 | Literal Tailwind Color (text-white) | `className="absolute top-1 right-1 p-0.5 rounded-fu...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 278 | Hardcoded Font Family | `<div className="flex items-center justify-between ...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 292 | Hardcoded Font Family | `"px-4 py-3 md:px-6 md:py-4 bg-background/95 backdr...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 311 | Hardcoded Font Family | `<span className="text-[10px] font-mono font-bold t...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 348 | Literal Tailwind Color (bg-white) | `<span className="text-[10px] font-black text-amber...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 414 | Hardcoded Font Family | `"w-full bg-muted/30 hover:bg-muted/50 focus:bg-bac...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 427 | Hardcoded Font Family | `<span id="char-counter" className={cn("absolute bo...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 502 | Literal Tailwind Color (text-white) | `? "bg-rose-500 text-white hover:bg-rose-600 shadow...` |
| src/features/inbox/components/chat/ChatInputArea.tsx | 514 | Literal Tailwind Color (text-white) | `<TooltipContent side="top" className="text-[10px] ...` |
| src/features/inbox/components/chat/ChatInputToolbars.tsx | 197 | Hardcoded Font Family | `<span className="font-mono text-primary/80">/{repl...` |
| src/features/inbox/components/chat/ChatMessageBubble.tsx | 330 | Hardcoded Font Family | `<TextWithLinks text={message.content} className={c...` |
| src/features/inbox/components/chat/ChatMessageInput.tsx | 194 | Literal Tailwind Color (text-white) | `className="absolute top-1 right-1 p-0.5 rounded-fu...` |
| src/features/inbox/components/chat/ChatMessageInput.tsx | 259 | Hardcoded Font Family | `className={cn("min-h-[40px] max-h-[120px] resize-n...` |
| src/features/inbox/components/chat/ChatMessagesArea.tsx | 383 | Hardcoded Font Family | `<div ref={scrollContainerRef} role="log" aria-labe...` |
| src/features/inbox/components/chat/ChatQuickRepliesPopover.tsx | 32 | Hardcoded Font Family | `className="absolute bottom-20 left-4 right-4 bg-ba...` |
| src/features/inbox/components/chat/ChatSearchFilters.tsx | 81 | Literal Tailwind Color (text-white) | `isActive ? 'bg-primary text-white shadow-sm' : 'bg...` |
| src/features/inbox/components/chat/ChatSearchFilters.tsx | 99 | Literal Tailwind Color (text-white) | `hasDateFilter ? 'bg-primary text-white shadow-sm' ...` |
| src/features/inbox/components/chat/MarkdownPreview.tsx | 17 | Hardcoded Font Family | `.replace(/```([\s\S]*?)```/g, '<code class="bg-mut...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 98 | Hardcoded Font Family | `Tentativa <span className="font-mono text-foregrou...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 100 | Hardcoded Font Family | `<span className="font-mono text-foreground">{total...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 110 | Hardcoded Font Family | `<dd className="font-mono text-foreground">{fmt(row...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 114 | Hardcoded Font Family | `<dd className="font-mono text-foreground">{fmt(row...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 118 | Hardcoded Font Family | `<dd className="font-mono text-foreground">` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 124 | Hardcoded Font Family | `<dd className="font-mono text-foreground">{fmt(row...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 133 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/features/inbox/components/chat/MessageAttemptsTimeline.tsx | 138 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/features/inbox/components/chat/MessageBubble.tsx | 125 | Hardcoded Font Family | `'flex group gap-2 transition-all duration-300 focu...` |
| src/features/inbox/components/chat/MessageBubble.tsx | 259 | Literal Tailwind Color (bg-black) | `? 'absolute bottom-2 right-2 text-white drop-shado...` |
| src/features/inbox/components/chat/MessageBubble.tsx | 259 | Literal Tailwind Color (text-white) | `? 'absolute bottom-2 right-2 text-white drop-shado...` |
| src/features/inbox/components/chat/MessageBubbleUnsupported.tsx | 63 | Hardcoded Font Family | `'text-[10px] px-1 py-px rounded font-mono',` |
| src/features/inbox/components/chat/MessageBubbleUnsupported.tsx | 80 | Hardcoded Font Family | `'mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 126 | Hardcoded Font Family | `<SheetDescription className="text-[11px] mt-1 trun...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 236 | Hardcoded Font Family | `<Badge variant="outline" className="text-[9px] h-4...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 279 | Hardcoded Font Family | `<span className="font-medium font-mono text-[11px]...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 283 | Hardcoded Font Family | `<pre className="mt-1 text-[10px] text-muted-foregr...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 302 | Hardcoded Font Family | `<pre className="mt-2 text-[10px] bg-muted/30 borde...` |
| src/features/inbox/components/chat/MessageSendHistorySheet.tsx | 332 | Hardcoded Font Family | `<span className={cn('text-foreground text-right mi...` |
| src/features/inbox/components/chat/MessageStatusPanel.tsx | 267 | Hardcoded Font Family | `<p className="font-mono text-[11px] opacity-80">` |
| src/features/inbox/components/chat/SendErrorBanner.tsx | 84 | Hardcoded Font Family | `<div className="border-t border-destructive/30 bg-...` |
| src/features/inbox/components/contact-details/Contact360Helpers.tsx | 112 | Hardcoded Font Family | `{company.cnpj && <p className="text-[10px] text-mu...` |
| src/features/inbox/components/contact-details/Contact360Panel.tsx | 124 | Hardcoded Font Family | `<span className="font-mono">{formatPhoneForDisplay...` |
| src/features/inbox/components/contact-details/ContactAccordionSections.tsx | 155 | Literal Tailwind Color (bg-white) | `<AccordionTrigger className="px-4 py-2.5 text-[11p...` |
| src/features/inbox/components/contact-details/ContactAccordionSections.tsx | 240 | Literal Tailwind Color (bg-white) | `<AccordionTrigger className="px-4 py-2.5 text-[11p...` |
| src/features/inbox/components/contact-details/ContactAccordionSections.tsx | 275 | Literal Tailwind Color (bg-white) | `<AccordionTrigger className="px-4 py-2.5 text-[11p...` |
| src/features/inbox/components/contact-details/ContactHeaderSection.tsx | 139 | Hardcoded Font Family | `<p className="text-[11px] text-muted-foreground mt...` |
| src/features/inbox/components/contact-details/ContactInfoSection.tsx | 121 | Hardcoded Font Family | `<span className="text-foreground font-mono text-xs...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 123 | Literal Tailwind Color (bg-white) | `<div key={i} className="flex-1 h-[3px] rounded-ful...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 124 | Literal Tailwind Color (bg-white) | `<div className={cn('h-full rounded-full transition...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 135 | Literal Tailwind Color (text-white) | `<p className="text-xs font-medium text-white/90">{...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 136 | Literal Tailwind Color (text-white) | `{time && <p className="text-[10px] text-white/50">...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 140 | Literal Tailwind Color (text-white) | `<span className="text-[10px] text-white/40 mr-2">{...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 141 | Literal Tailwind Color (bg-white) | `<Button variant="ghost" size="icon" onClick={onClo...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 141 | Literal Tailwind Color (text-white, text-white) | `<Button variant="ghost" size="icon" onClick={onClo...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 161 | Literal Tailwind Color (text-white) | `<div className="flex flex-col items-center gap-3 t...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 165 | Literal Tailwind Color (text-white) | `<div className="text-center text-white/70 space-y-...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 169 | Literal Tailwind Color (text-white) | `<div className="flex flex-col items-center gap-3 t...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 173 | Literal Tailwind Color (text-white) | `<div className="text-center text-white/70 space-y-...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 177 | Literal Tailwind Color (text-white) | `<p className="text-lg font-medium text-white leadi...` |
| src/features/inbox/components/contact-details/StoryViewer.tsx | 186 | Literal Tailwind Color (text-white) | `<p className="text-sm text-white/90 whitespace-pre...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 242 | Hardcoded Font Family | `'font-sans font-semibold text-[14px] leading-[1.2]...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 253 | Hardcoded Font Family | `<span className="font-sans text-[11px] font-normal...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 257 | Hardcoded Font Family | `<span className="min-w-[16px] h-4 px-1 rounded-ful...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 270 | Hardcoded Font Family | `'font-sans text-[12px] truncate leading-[1.35] min...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 290 | Hardcoded Font Family | `className="font-sans text-[10px] h-[15px] px-1.5 p...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 300 | Hardcoded Font Family | `<Badge variant="outline" className="font-sans text...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 402 | Literal Tailwind Color (text-white) | `<StatusIcon className="w-2 h-2 text-white" />` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 417 | Hardcoded Font Family | `'font-sans font-semibold text-[15px] leading-[1.2]...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 428 | Hardcoded Font Family | `<span className="font-sans text-[11px] font-semibo...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 453 | Hardcoded Font Family | `'font-sans text-[13.5px] leading-[1.35] truncate p...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 468 | Literal Tailwind Color (text-white) | `className="flex-shrink-0 min-w-[20px] h-[20px] px-...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 468 | Hardcoded Font Family | `className="flex-shrink-0 min-w-[20px] h-[20px] px-...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 483 | Hardcoded Font Family | `className="font-sans text-[10px] h-[16px] px-1.5 p...` |
| src/features/inbox/components/conversation-list/ConversationItem.tsx | 493 | Hardcoded Font Family | `<Badge variant="outline" className="font-sans text...` |
| src/features/inbox/components/linkPreviewUtils.ts | 50 | Hardcoded Hex Color | `.replace(/'/g, '&#039;');` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 16 | Hardcoded Hex Color | `const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 103 | Literal Tailwind Color (bg-blue-500) | `<Card className="bg-blue-500/5 border-blue-500/20"...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 106 | Literal Tailwind Color (text-blue-500) | `<Clock className="h-4 w-4 text-blue-500" />` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 126 | Hardcoded Hex Color | `<Bar dataKey="sent" name="Sucesso" fill="#10b981" ...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 127 | Hardcoded Hex Color | `<Bar dataKey="failed" name="Falha" fill="#ef4444" ...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 144 | Hardcoded Hex Color | `<Line type="monotone" dataKey="latency" name="Latê...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 168 | Hardcoded Hex Color | `<Cell key={`cell-${index}`} fill={entry.name === '...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 192 | Hardcoded Hex Color | `<Bar dataKey="latency" name="Latência" fill="#8b5c...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 238 | Hardcoded Hex Color | `<Bar dataKey="total_requests" name="Total" fill="#...` |
| src/features/inbox/components/monitoring/QueueMetricsDashboard.tsx | 239 | Hardcoded Hex Color | `<Bar dataKey="failed_requests" name="Falhas" fill=...` |
| src/features/inbox/components/template-utils.ts | 17 | Hardcoded Hex Color | `{ key: 'protocolo', label: 'Protocolo', icon: Hash...` |
| src/features/inbox/components/templates/TemplateEditorDialog.tsx | 133 | Hardcoded Font Family | `<Textarea ref={textareaRef} value={content} onChan...` |
| src/features/sla/components/SLADeliveryHistoryDashboard.tsx | 122 | Hardcoded Font Family | `<TableCell className="text-xs font-mono opacity-70...` |
| src/hooks/__tests__/useDashboardData.test.tsx | 27 | Hardcoded Hex Color | `data: [{ id: 'q1', name: 'Support', color: '#3B82F...` |
| src/hooks/__tests__/useExternalCatalog.test.ts | 89 | Hardcoded Hex Color | `color_hex: '#4169E1',` |
| src/hooks/__tests__/useExternalCatalog.test.ts | 527 | Hardcoded Hex Color | `expect(variant.color_hex).toBe('#4169E1');` |
| src/hooks/__tests__/useExternalCatalog.test.ts | 692 | Hardcoded Hex Color | `mockVariant({ color_hex: '#4169E1', stock_quantity...` |
| src/hooks/__tests__/useExternalCatalog.test.ts | 693 | Hardcoded Hex Color | `mockVariant({ id: 'var2', color_hex: '#EF941B', st...` |
| src/hooks/__tests__/useExternalCatalog.test.ts | 706 | Hardcoded Hex Color | `expect(fetched!.variants![0].color_hex).toBe('#416...` |
| src/hooks/__tests__/useQueuesComparison.test.tsx | 32 | Hardcoded Hex Color | `{ id: 'q1', name: 'Suporte', color: '#3B82F6' },` |
| src/hooks/__tests__/useQueuesComparison.test.tsx | 33 | Hardcoded Hex Color | `{ id: 'q2', name: 'Vendas', color: '#10B981' },` |
| src/hooks/__tests__/useTags.test.tsx | 41 | Hardcoded Hex Color | `{ id: 't1', name: 'Urgente', color: '#ef4444', des...` |
| src/hooks/__tests__/useTags.test.tsx | 42 | Hardcoded Hex Color | `{ id: 't2', name: 'VIP', color: '#f59e0b', descrip...` |
| src/hooks/useQueues.ts | 106 | Hardcoded Hex Color | `color: queue.color || '#3B82F6',` |
| src/hooks/useThemeAudit.ts | 51 | Hardcoded Font Family | `const computedFont = getComputedStyle(root).getPro...` |
| src/hooks/useThemeAudit.ts | 67 | Hardcoded Font Family | `violations.push(`[Font] Tipografia desalinhada: --...` |
| src/hooks/useGmailLabels.ts | 13 | Hardcoded Hex Color | `{ id: 'INBOX',     name: 'Inbox',     icon: 'inbox...` |
| src/hooks/useGmailLabels.ts | 14 | Hardcoded Hex Color | `{ id: 'STARRED',   name: 'Favoritos', icon: 'star'...` |
| src/hooks/useGmailLabels.ts | 15 | Hardcoded Hex Color | `{ id: 'IMPORTANT', name: 'Importantes',icon: 'flag...` |
| src/hooks/useGmailLabels.ts | 16 | Hardcoded Hex Color | `{ id: 'SENT',      name: 'Enviados',  icon: 'send'...` |
| src/hooks/useGmailLabels.ts | 17 | Hardcoded Hex Color | `{ id: 'DRAFTS',    name: 'Rascunhos', icon: 'draft...` |
| src/hooks/useGmailLabels.ts | 18 | Hardcoded Hex Color | `{ id: 'SPAM',      name: 'Spam',      icon: 'block...` |
| src/hooks/useGmailLabels.ts | 19 | Hardcoded Hex Color | `{ id: 'TRASH',     name: 'Lixeira',   icon: 'delet...` |
| src/index.css | 23 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/index.css | 129 | Hardcoded Hex Color | `color: #000 !important;` |
| src/index.css | 130 | Hardcoded Hex Color | `background-color: #fff !important;` |
| src/index.css | 131 | Hardcoded Hex Color | `border-color: #000 !important;` |
| src/index.css | 135 | Hardcoded Hex Color | `border: 2px solid #000 !important;` |
| src/lib/__tests__/utils.test.ts | 37 | Literal Tailwind Color (text-red-500) | `const result = cn('text-red-500', 'text-blue-500')...` |
| src/lib/__tests__/utils.test.ts | 37 | Literal Tailwind Color (text-blue-500) | `const result = cn('text-red-500', 'text-blue-500')...` |
| src/lib/__tests__/utils.test.ts | 38 | Literal Tailwind Color (text-blue-500) | `expect(result).toBe('text-blue-500');` |
| src/lib/contact-health.ts | 43 | Literal Tailwind Color (bg-blue-500) | `if (score >= 70) return 'text-blue-500 bg-blue-500...` |
| src/lib/contact-health.ts | 43 | Literal Tailwind Color (text-blue-500) | `if (score >= 70) return 'text-blue-500 bg-blue-500...` |
| src/lib/devRealtimeLogger.ts | 90 | Hardcoded Hex Color | `const STYLE_REG = 'color:#888;font-weight:600';` |
| src/lib/devRealtimeLogger.ts | 91 | Hardcoded Hex Color | `const STYLE_HOOK = 'color:#3b82f6;font-weight:700'...` |
| src/lib/devRealtimeLogger.ts | 92 | Hardcoded Hex Color | `const STYLE_EVENT_INSERT = 'color:#16a34a;font-wei...` |
| src/lib/devRealtimeLogger.ts | 93 | Hardcoded Hex Color | `const STYLE_EVENT_UPDATE = 'color:#d97706;font-wei...` |
| src/lib/devRealtimeLogger.ts | 94 | Hardcoded Hex Color | `const STYLE_EVENT_DELETE = 'color:#dc2626;font-wei...` |
| src/lib/devRealtimeLogger.ts | 95 | Hardcoded Hex Color | `const STYLE_DIM = 'color:#888';` |
| src/main.tsx | 48 | Hardcoded Font Family | `<div role="alert" className="p-6 font-sans max-w-2...` |
| src/main.tsx | 57 | Hardcoded Font Family | `<pre className="mt-4 p-3 bg-muted text-destructive...` |
| src/pages/AdminDispatchErrorsHistoryPage.tsx | 142 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">{r.instan...` |
| src/pages/AdminDispatchErrorsHistoryPage.tsx | 143 | Hardcoded Font Family | `<TableCell className="text-xs font-mono truncate m...` |
| src/pages/AdminDispatchErrorsHistoryPage.tsx | 146 | Hardcoded Font Family | `<TableCell className="text-xs font-mono truncate m...` |
| src/pages/AdminEvolutionApiLogsPage.tsx | 239 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">{row.acti...` |
| src/pages/AdminEvolutionApiLogsPage.tsx | 270 | Hardcoded Font Family | `<DialogTitle className="font-mono text-base">{sele...` |
| src/pages/AdminEvolutionApiLogsPage.tsx | 298 | Hardcoded Font Family | `<div key={i} className="text-xs bg-muted/30 rounde...` |
| src/pages/AdminEvolutionApiLogsPage.tsx | 308 | Hardcoded Font Family | `ID: <span className="font-mono">{selected.id}</spa...` |
| src/pages/AdminInstancePausesPage.tsx | 196 | Hardcoded Font Family | `<td className="py-2 pr-4 font-mono text-xs">{p.ins...` |
| src/pages/AdminInstancePausesPage.tsx | 204 | Hardcoded Font Family | `<td className="py-2 pr-4 text-xs font-mono">{p.tri...` |
| src/pages/AdminInstancePausesPage.tsx | 259 | Hardcoded Font Family | `<td className="py-2 pr-4 font-mono text-xs">{p.ins...` |
| src/pages/AdminInstancePausesPage.tsx | 264 | Hardcoded Font Family | `<td className="py-2 pr-4 text-xs font-mono">{p.tri...` |
| src/pages/AdminWebhookEventsPage.tsx | 316 | Hardcoded Font Family | `className="w-[200px] font-mono"` |
| src/pages/AdminWebhookEventsPage.tsx | 440 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/pages/AdminWebhookEventsPage.tsx | 444 | Hardcoded Font Family | `<TableCell className="font-mono text-xs" data-test...` |
| src/pages/AdminWebhookEventsPage.tsx | 447 | Hardcoded Font Family | `<span className="font-mono" data-testid="webhook-e...` |
| src/pages/AdminWebhookEventsPage.tsx | 588 | Hardcoded Font Family | `<p className={cn('font-medium break-all', mono && ...` |
| src/pages/AdminWebhookOverviewPage.tsx | 356 | Hardcoded Font Family | `<TableHead key={i} className="text-center font-mon...` |
| src/pages/AdminWebhookOverviewPage.tsx | 375 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">{t}</Tabl...` |
| src/pages/AdminWebhookOverviewPage.tsx | 385 | Hardcoded Font Family | `className="p-0 text-center text-xs font-mono"` |
| src/pages/AdminWebhookOverviewPage.tsx | 438 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">{row.type...` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 366 | Hardcoded Font Family | `<div className="text-xs text-muted-foreground mt-2...` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 521 | Hardcoded Font Family | `<span className="font-mono">{secret?.length ?? 0} ...` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 525 | Hardcoded Font Family | `<span className="font-mono">{secret?.hashPrefix ? ...` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 540 | Hardcoded Font Family | `<span className="font-mono">{unsigned}</span>` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 544 | Hardcoded Font Family | `<span className="font-mono">{errored}</span>` |
| src/pages/AdminWebhookSecretStatusPage.tsx | 625 | Hardcoded Font Family | `<td className="py-2 pr-4 font-mono text-xs">{e.eve...` |
| src/pages/Auth.tsx | 92 | Hardcoded Font Family | `<span className="text-sm font-mono text-destructiv...` |
| src/pages/Auth.tsx | 162 | Hardcoded Hex Color | `<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4....` |
| src/pages/Auth.tsx | 163 | Hardcoded Hex Color | `<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2....` |
| src/pages/Auth.tsx | 164 | Hardcoded Hex Color | `<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.1...` |
| src/pages/Auth.tsx | 165 | Hardcoded Hex Color | `<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3....` |
| src/pages/NotFound.tsx | 47 | Hardcoded Font Family | `A rota <code className="text-xs bg-muted px-2 py-1...` |
| src/pages/NotFound.tsx | 74 | Hardcoded Font Family | `Dica: use <kbd className="px-1.5 py-0.5 rounded bg...` |
| src/pages/RealtimeFanoutDebug.tsx | 142 | Hardcoded Font Family | `<span className={cn("font-mono text-sm font-semibo...` |
| src/pages/RealtimeFanoutDebug.tsx | 161 | Hardcoded Font Family | `<p className="text-[11px] font-mono text-muted-for...` |
| src/pages/RealtimeFanoutDebug.tsx | 173 | Hardcoded Font Family | `<span className="font-mono text-muted-foreground">...` |
| src/pages/RealtimeFanoutDebug.tsx | 175 | Hardcoded Font Family | `<div className="font-mono text-[10px] text-muted-f...` |
| src/pages/RealtimeFanoutDebug.tsx | 205 | Hardcoded Font Family | `<span className="font-mono text-muted-foreground t...` |
| src/pages/RealtimeFanoutDebug.tsx | 207 | Hardcoded Font Family | `<span className="font-mono font-semibold text-prim...` |
| src/pages/RealtimeFanoutDebug.tsx | 208 | Hardcoded Font Family | `<span className="font-mono text-muted-foreground/8...` |
| src/pages/SLAAlertHistory.tsx | 76 | Hardcoded Font Family | `Thread ID: <span className="text-foreground/80 fon...` |
| src/pages/SendStatusBusDebug.tsx | 85 | Hardcoded Font Family | `<span className="font-mono text-[10px] text-muted-...` |
| src/pages/admin-realtime-monitor/DispatchErrorsBlock.tsx | 63 | Hardcoded Font Family | `<TableCell className="text-xs font-mono truncate m...` |
| src/pages/admin-realtime-monitor/DispatchErrorsBlock.tsx | 107 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">{c.instan...` |
| src/pages/admin-realtime-monitor/EventsLiveBlock.tsx | 125 | Hardcoded Font Family | `<TableCell className="text-xs font-mono">{r.event_...` |
| src/pages/admin-search-insights/SearchInsightsTables.tsx | 45 | Hardcoded Font Family | `<TableCell className="font-mono text-xs max-w-[280...` |
| src/pages/admin-search-insights/SearchInsightsTables.tsx | 82 | Hardcoded Font Family | `<TableCell className="font-mono text-xs max-w-[280...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 105 | Hardcoded Font Family | `<td className="p-3 text-xs text-muted-foreground w...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 109 | Hardcoded Font Family | `className="p-3 text-xs font-mono text-primary"` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 114 | Hardcoded Font Family | `<td className="p-3 text-xs font-mono text-muted-fo...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 116 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 118 | Hardcoded Font Family | `<td className="p-3 font-mono text-xs font-medium t...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 119 | Hardcoded Font Family | `<td className="p-3 text-right font-mono font-bold ...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 124 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 125 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/ClientTelemetryPanel.tsx | 126 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 48 | Hardcoded Font Family | `<td className="p-3 text-xs text-muted-foreground w...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 52 | Hardcoded Font Family | `<Badge variant="outline" className="text-[10px] fo...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 56 | Hardcoded Font Family | `<td className="p-3 font-mono text-xs font-medium">` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 59 | Hardcoded Font Family | `<td className="p-3 text-right font-mono font-bold ...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 64 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 67 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/TelemetryTable.tsx | 70 | Hardcoded Font Family | `<td className="p-3 text-right font-mono text-xs ta...` |
| src/pages/admin-telemetria/TelemetryTopOffenders.tsx | 30 | Hardcoded Font Family | `<p className="font-mono text-sm font-medium trunca...` |
| src/pages/admin-webhook-overview/CallCorrelationView.tsx | 110 | Hardcoded Font Family | `<span className="font-mono">{instance}</span>` |
| src/pages/admin-webhook-overview/CallCorrelationView.tsx | 137 | Hardcoded Font Family | `<code className="text-xs font-mono bg-muted px-2 p...` |
| src/pages/admin-webhook-overview/CallCorrelationView.tsx | 153 | Hardcoded Font Family | `<span className="font-mono">{shortJid(call.remoteJ...` |
| src/pages/admin-webhook-overview/CallCorrelationView.tsx | 202 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/pages/admin-webhook-secret-status/HmacSelfTestButton.tsx | 335 | Hardcoded Font Family | `className="text-muted-foreground font-mono text-[1...` |
| src/pages/admin-webhook-secret-status/InstanceBreakdownTable.tsx | 108 | Hardcoded Font Family | `<td className="py-2 pr-4 font-mono text-xs">{s.ins...` |
| src/pages/admin-webhook-secret-status/InstanceBreakdownTable.tsx | 109 | Hardcoded Font Family | `<td className="py-2 pr-4 text-right font-mono">` |
| src/pages/admin-webhook-secret-status/InstanceBreakdownTable.tsx | 112 | Hardcoded Font Family | `<td className="py-2 pr-4 text-right font-mono">` |
| src/pages/admin-webhook-secret-status/InstanceBreakdownTable.tsx | 115 | Hardcoded Font Family | `<td className="py-2 pr-4 text-right font-mono">` |
| src/pages/admin-webhook-secret-status/InstanceStatusCards.tsx | 46 | Hardcoded Font Family | `<div className="text-xs text-muted-foreground mt-1...` |
| src/pages/admin-webhook-secret-status/RecheckResultDialog.tsx | 83 | Hardcoded Font Family | `<dd className="col-span-2 font-mono break-all">{re...` |
| src/pages/admin-webhook-secret-status/RecheckResultDialog.tsx | 98 | Hardcoded Font Family | `<dd className="col-span-2 font-mono text-[10px] br...` |
| src/pages/admin-webhook-secret-status/RecheckResultDialog.tsx | 103 | Hardcoded Font Family | `<dd className="col-span-2 font-mono text-[10px] br...` |
| src/pages/admin-webhook-secret-status/WebhookAlertHistoryPanel.tsx | 163 | Hardcoded Font Family | `<td className="px-3 py-2 whitespace-nowrap font-mo...` |
| src/pages/admin-webhook-secret-status/WebhookAlertHistoryPanel.tsx | 175 | Hardcoded Font Family | `<td className="px-3 py-2 font-mono text-[11px]">` |
| src/pages/admin/AdminAutomationLogsPage.tsx | 275 | Hardcoded Font Family | `<TableCell className="text-xs font-mono truncate m...` |
| src/pages/admin/AdminAutomationLogsPage.tsx | 396 | Hardcoded Font Family | `<span className={mono ? "font-mono truncate max-w-...` |
| src/pages/admin/AdminChannelsPage.tsx | 83 | Hardcoded Hex Color | `color: "#3B82F6",` |
| src/pages/admin/AdminChannelsPage.tsx | 160 | Hardcoded Hex Color | `p_color: editing.color ?? "#3B82F6",` |
| src/pages/admin/AdminChannelsPage.tsx | 287 | Literal Tailwind Color (text-white) | `className="w-9 h-9 rounded-full grid place-items-c...` |
| src/pages/admin/AdminChannelsPage.tsx | 480 | Hardcoded Hex Color | `<Input type="color" value={editing.color ?? "#3B82...` |
| src/pages/admin/AdminDevDiagnosticsPage.tsx | 103 | Literal Tailwind Color (text-green-500) | `<div className="text-2xl font-bold text-green-500"...` |
| src/pages/admin/AdminDevDiagnosticsPage.tsx | 141 | Literal Tailwind Color (bg-black, bg-black) | `<ScrollArea className="h-[500px] w-full border rou...` |
| src/pages/admin/AdminDevDiagnosticsPage.tsx | 158 | Hardcoded Font Family | `<TableRow key={log.id} className="font-mono text-x...` |
| src/pages/admin/AdminFailedAuthMessagesPage.tsx | 205 | Hardcoded Font Family | `<TableCell className="text-muted-foreground font-m...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 347 | Hardcoded Font Family | `Verifica o pipeline FATOR X (<code className="font...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 389 | Hardcoded Font Family | `O cursor externo (<code className="font-mono">evol...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 447 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground font-m...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 457 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground font-m...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 489 | Hardcoded Font Family | `<span className="text-sm font-mono w-6 text-muted-...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 494 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground font-m...` |
| src/pages/admin/AdminInboxSyncStatusPage.tsx | 568 | Hardcoded Font Family | `<span className="font-mono font-medium">{a.action ...` |
| src/pages/admin/AdminProvidersPage.tsx | 128 | Hardcoded Font Family | `<div className="text-xs font-mono text-muted-foreg...` |
| src/pages/admin/AdminProvidersPage.tsx | 186 | Hardcoded Font Family | `<span className="text-xs font-mono text-muted-fore...` |
| src/pages/admin/AdminProvidersPage.tsx | 193 | Hardcoded Font Family | `<span className="text-xs font-mono text-muted-fore...` |
| src/pages/admin/AdminQueuesPage.tsx | 100 | Hardcoded Hex Color | `color: editing.color ?? "#3B82F6",` |
| src/pages/admin/AdminQueuesPage.tsx | 220 | Hardcoded Hex Color | `is_active: true, color: "#3B82F6", priority: 0, ma...` |
| src/pages/admin/AdminQueuesPage.tsx | 242 | Hardcoded Hex Color | `<Input type="color" value={editing?.color ?? "#3B8...` |
| src/pages/admin/AdminStressTestPage.tsx | 583 | Literal Tailwind Color (text-blue-500) | `<ShieldCheck className="h-4 w-4 text-blue-500" /> ...` |
| src/pages/admin/AdminStressTestPage.tsx | 618 | Hardcoded Font Family | `<ul className="space-y-1 font-mono text-xs">` |
| src/pages/admin/AdminStressTestPage.tsx | 636 | Literal Tailwind Color (text-blue-500) | `{r.accessibility.reachable ? <ShieldCheck classNam...` |
| src/pages/admin/AdminStressTestPage.tsx | 726 | Literal Tailwind Color (text-yellow-500) | `<ShieldAlert className="h-4 w-4 text-yellow-500" /...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 69 | Literal Tailwind Color (bg-blue-600, bg-blue-700) | `if (mode === "official") return <Badge variant="de...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 164 | Hardcoded Font Family | `Envios, webhooks e erros de integração. Modo ativo...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 238 | Hardcoded Font Family | `<td className="py-2 pr-3 font-mono text-xs">{r.ins...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 240 | Hardcoded Font Family | `<td className="py-2 pr-3 font-mono text-xs truncat...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 284 | Hardcoded Font Family | `<td className="py-2 pr-3 font-mono text-xs">` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 329 | Hardcoded Font Family | `<td className="py-2 pr-3 font-mono text-xs">{r.ins...` |
| src/pages/admin/AdminWhatsAppLogsPage.tsx | 330 | Hardcoded Font Family | `<td className="py-2 pr-3 font-mono text-xs truncat...` |
| src/pages/admin/AdminWhatsAppModePage.tsx | 228 | Hardcoded Font Family | `<Input readOnly value={webhookUrl} className="font...` |
| src/pages/admin/AdminWhatsAppModePage.tsx | 333 | Hardcoded Font Family | `<li key={i} className="text-[11px] flex items-cent...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 38 | Hardcoded Font Family | `<Badge variant="outline" className="text-sm font-m...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 47 | Literal Tailwind Color (text-green-500) | `<CheckCircle2 className="w-5 h-5 text-green-500" /...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 58 | Literal Tailwind Color (bg-slate-100) | `<code className="bg-slate-100 p-1 rounded text-xs ...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 62 | Literal Tailwind Color (bg-slate-900) | `<div className="text-xs font-mono bg-slate-900 tex...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 62 | Literal Tailwind Color (text-slate-100) | `<div className="text-xs font-mono bg-slate-900 tex...` |
| src/pages/admin/AuditEvidenceDashboard.tsx | 62 | Hardcoded Font Family | `<div className="text-xs font-mono bg-slate-900 tex...` |
| src/pages/admin/FeatureFlags.tsx | 159 | Literal Tailwind Color (text-white) | `{flag.value.killSwitch && <span className="text-[1...` |
| src/pages/admin/FeatureFlags.tsx | 185 | Hardcoded Font Family | `<span className="font-mono font-bold w-8">{flag.va...` |
| src/pages/admin/FeatureFlags.tsx | 199 | Hardcoded Font Family | `className="w-full bg-muted/50 border-none rounded-...` |
| src/pages/admin/FeatureFlags.tsx | 239 | Hardcoded Font Family | `{res.latency && <span className="text-[9px] text-m...` |
| src/pages/admin/FeatureFlags.tsx | 241 | Literal Tailwind Color (text-green-500) | `<CheckCircle2 className="w-4 h-4 text-green-500" /...` |
| src/pages/admin/FeatureFlags.tsx | 267 | Hardcoded Font Family | `<div className="text-[11px] font-mono break-all li...` |
| src/pages/admin/HmacSelfTestPage.tsx | 350 | Hardcoded Font Family | `<> Use <code className="font-mono">req={result.req...` |
| src/pages/admin/HmacSelfTestPage.tsx | 415 | Hardcoded Font Family | `{result.request_id && <> · req <code className="fo...` |
| src/pages/admin/RateLimitDashboard.tsx | 191 | Hardcoded Font Family | `<code className="text-sm font-mono">{endpoint.endp...` |
| src/pages/admin/RateLimitDashboard.tsx | 217 | Hardcoded Font Family | `<code className="text-sm font-mono">{ip.ip}</code>` |
| src/pages/admin/RateLimitDashboard.tsx | 266 | Hardcoded Font Family | `<code className="font-mono text-sm">{log.ip_addres...` |
| src/pages/admin/RateLimitDashboard.tsx | 269 | Hardcoded Font Family | `<code className="font-mono text-sm">{log.endpoint}...` |
| src/pages/admin/RoutePermissionsPage.tsx | 170 | Literal Tailwind Color (text-red-500) | `<span className="font-bold border-b pb-1 text-red-...` |
| src/pages/admin/RoutePermissionsPage.tsx | 184 | Literal Tailwind Color (text-blue-500) | `<span className="font-bold border-b pb-1 text-blue...` |
| src/pages/admin/RoutePermissionsPage.tsx | 191 | Literal Tailwind Color (text-gray-500) | `<span className="font-bold border-b pb-1 text-gray...` |
| src/pages/admin/RoutePermissionsPage.tsx | 267 | Hardcoded Font Family | `<div className="font-mono text-sm">{row.path}</div...` |
| src/pages/admin/external-db-explorer/QueryExplorerBlock.tsx | 264 | Hardcoded Font Family | `className="w-full font-mono text-xs rounded-md bor...` |
| src/pages/admin/external-db-explorer/QueryExplorerBlock.tsx | 309 | Hardcoded Font Family | `<AlertDescription className="font-mono text-xs">{r...` |
| src/pages/admin/external-db-explorer/QueryExplorerBlock.tsx | 333 | Hardcoded Font Family | `<span className={isObj ? 'font-mono text-muted-for...` |
| src/pages/admin/operations/OpsLogsTab.tsx | 187 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">` |
| src/pages/admin/operations/OpsLogsTab.tsx | 190 | Hardcoded Font Family | `<TableCell className="font-mono text-xs">` |
| src/pages/admin/AdminEmailStatusPage.tsx | 167 | Literal Tailwind Color (text-yellow-500) | `case 'degraded': return <AlertTriangle className="...` |
| src/pages/admin/AdminEmailStatusPage.tsx | 202 | Literal Tailwind Color (bg-yellow-50) | `<Alert variant={health.status === 'error' ? 'destr...` |
| src/pages/admin/AdminEmailStatusPage.tsx | 202 | Literal Tailwind Color (text-yellow-800) | `<Alert variant={health.status === 'error' ? 'destr...` |
| src/pages/admin/AdminEmailStatusPage.tsx | 279 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono">Tot...` |
| src/pages/admin/AdminEmailStatusPage.tsx | 328 | Hardcoded Font Family | `<td className="px-4 py-2"><Badge variant="outline"...` |
| src/pages/admin/AdminEmailAuditPage.tsx | 59 | Literal Tailwind Color (bg-blue-500) | `case 'processing': return <Badge variant="secondar...` |
| src/pages/failed-messages/FailedMessageDetailsSheet.tsx | 34 | Hardcoded Font Family | `<span className="font-mono text-xs">` |
| src/pages/failed-messages/FailedMessageDetailsSheet.tsx | 83 | Hardcoded Font Family | `<p className="text-sm font-mono truncate" title={s...` |
| src/pages/failed-messages/FailedMessageDetailsSheet.tsx | 91 | Hardcoded Font Family | `<div className="bg-muted p-2 rounded text-xs font-...` |
| src/pages/failed-messages/FailedMessageDetailsSheet.tsx | 113 | Literal Tailwind Color (bg-black) | `<ScrollArea className="h-[250px] w-full rounded bo...` |
| src/pages/failed-messages/FailedMessageDetailsSheet.tsx | 114 | Hardcoded Font Family | `<pre className="text-[11px] text-muted-foreground ...` |
| src/pages/failed-messages/FailedMessagesErrorCodeChart.tsx | 31 | Hardcoded Font Family | `<span className="text-xs font-mono w-32 truncate s...` |
| src/pages/DesignSystem.tsx | 57 | Hardcoded Font Family | `<p className="text-xs font-mono bg-muted/30 p-2 ro...` |
| src/pages/DesignSystem.tsx | 70 | Hardcoded Hex Color | `<ColorSwatch name="Background" hex="#000000" descr...` |
| src/pages/DesignSystem.tsx | 127 | Hardcoded Font Family | `<Badge variant="outline" className="font-mono text...` |
| src/pages/DesignSystem.tsx | 253 | Hardcoded Font Family | `<TableCell className="font-mono">#INV-001</TableCe...` |
| src/pages/DesignSystem.tsx | 259 | Hardcoded Font Family | `<TableCell className="font-mono">#INV-002</TableCe...` |
| src/pages/DesignSystem.tsx | 325 | Hardcoded Font Family | `<p className="text-xs text-muted-foreground font-m...` |
| src/styles/base.css | 24 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/styles/components.css | 171 | Hardcoded Hex Color | `background-color: #000000 !important;` |
| src/styles/components.css | 177 | Hardcoded Hex Color | `background-color: #000000 !important;` |
| src/styles/tokens.css | 6 | Hardcoded Font Family | `--font-sans: "Inter", -apple-system, BlinkMacSyste...` |
| src/styles/utilities.css | 40 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/styles/utilities.css | 45 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/styles/utilities.css | 50 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/styles/utilities.css | 55 | Hardcoded Font Family | `font-family: var(--font-sans);` |
| src/utils/whatsappFileTypes.ts | 194 | Literal Tailwind Color (bg-yellow-500) | `{ value: 'lead', label: 'Lead', color: 'bg-yellow-...` |
| src/utils/emailMappers.test.ts | 122 | Hardcoded Hex Color | `color: '#ff0000',` |
| src/stories/button.css | 11 | Hardcoded Hex Color | `background-color: #555ab9;` |
| src/stories/button.css | 17 | Hardcoded Hex Color | `color: #333;` |
| src/stories/header.css | 30 | Hardcoded Hex Color | `color: #333;` |
| src/stories/page.css | 5 | Hardcoded Hex Color | `color: #333;` |
| src/stories/page.css | 42 | Hardcoded Hex Color | `background: #e7fdd8;` |
| src/stories/page.css | 44 | Hardcoded Hex Color | `color: #357a14;` |
| src/stories/page.css | 67 | Hardcoded Hex Color | `fill: #1ea7fd;` |
| src/stories/Header.tsx | 25 | Hardcoded Hex Color | `fill="#FFF"` |
| src/stories/Header.tsx | 29 | Hardcoded Hex Color | `fill="#555AB9"` |
| src/stories/Header.tsx | 33 | Hardcoded Hex Color | `fill="#91BAF8"` |
| src/stories/Page.tsx | 64 | Hardcoded Hex Color | `fill="#999"` |

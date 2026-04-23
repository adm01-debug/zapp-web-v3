import {
  MessageSquare,
  MessagesSquare,
  User,
  UsersRound,
  BarChart3,
  Phone,
  Zap,
  Link2,
  Megaphone,
  Bot,
  Kanban,
  Wallet,
  Package,
  CreditCard,
  Tag,
  Brain,
  Workflow,
  Plug,
  Activity,
  PhoneCall,
  Calendar,
  CalendarClock,
  FileText,
  Globe,
  Inbox,
  FileBarChart,
  ClipboardList,
  AlertTriangle,
  Gauge,
  Mic,
  Trophy,
  Target,
  TrendingDown,
  Tags,
  Cpu,
  ShieldCheck,
  Shield,
  UserCog,
  Palette,
  BookOpen,
  Settings,
  Compass,
  LayoutDashboard,
  Lock,
  Mail,
  HardDrive,
  Building2,
  Sparkles,
  RefreshCw,
  Pause,
  Landmark,
  HeartPulse,
  BarChartHorizontal,
  ScrollText,
  Globe2,
  Code2,
  Webhook,
  BrainCircuit,
} from 'lucide-react';
import type { NavItemConfig } from './SidebarNavItem';

// ── Primary (always visible, ≤8 items) ────────────────────
export const primaryNav: readonly NavItemConfig[] = [
  { id: 'inbox', icon: MessageSquare, label: 'Chat' },
  { id: 'team-chat', icon: MessagesSquare, label: 'Teams' },
  { id: 'email-chat', icon: Mail, label: 'Email' },
  { id: 'contacts', icon: User, label: 'Contatos' },
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
  { id: 'talkx', icon: Sparkles, label: 'Campanhas' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
] as const;

// ── Sales & CRM ───────────────────────────────────────────
export const salesNav: readonly NavItemConfig[] = [
  { id: 'crm360', icon: Building2, label: 'CRM 360°' },
  { id: 'wallet', icon: Wallet, label: 'Carteira' },
  { id: 'catalog', icon: Package, label: 'Catálogo' },
  { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
  { id: 'tags', icon: Tag, label: 'Etiquetas' },
  { id: 'queues', icon: LayoutDashboard, label: 'Filas' },
  { id: 'schedule', icon: CalendarClock, label: 'Agendamentos' },
  { id: 'groups', icon: UsersRound, label: 'Grupos' },
] as const;

// ── Automation & AI ───────────────────────────────────────
export const automationNav: readonly NavItemConfig[] = [
  { id: 'chatbot', icon: Bot, label: 'Chatbot' },
  { id: 'automations', icon: RefreshCw, label: 'Automações' },
  { id: 'wa-flows', icon: Workflow, label: 'WhatsApp Flows' },
  { id: 'knowledge', icon: Brain, label: 'Base de Conhecimento' },
  { id: 'churn', icon: TrendingDown, label: 'Previsão Churn' },
  { id: 'ticket-classifier', icon: Tags, label: 'Classificador IA' },
  { id: 'campaigns', icon: Megaphone, label: 'Campanhas Clássicas' },
  { id: 'wa-templates', icon: FileText, label: 'Templates WA' },
] as const;

// ── Analytics (consolidated — was 12 items, now single group) ──
export const analyticsNav: readonly NavItemConfig[] = [
  { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
  { id: 'warroom', icon: AlertTriangle, label: 'War Room' },
  { id: 'sentiment', icon: HeartPulse, label: 'Sentimento' },
  { id: 'nps', icon: Gauge, label: 'NPS' },
  { id: 'sla', icon: Target, label: 'SLA' },
  { id: 'achievements', icon: Trophy, label: 'Conquistas' },
] as const;

// ── Connections & Integrations ────────────────────────────
export const connectionsNav: readonly NavItemConfig[] = [
  { id: 'connections', icon: Link2, label: 'Conexões' },
  { id: 'integrations', icon: Plug, label: 'Integrações' },
  { id: 'omni-inbox', icon: Inbox, label: 'Omnichannel' },
  { id: 'voip', icon: PhoneCall, label: 'VoIP' },
  { id: 'meta-capi', icon: Activity, label: 'Meta CAPI' },
  { id: 'google-calendar', icon: Calendar, label: 'Calendário' },
] as const;

// ── System & Admin ────────────────────────────────────────
export const systemNav: readonly NavItemConfig[] = [
  { id: 'agents', icon: Phone, label: 'Equipe' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'privacy', icon: ShieldCheck, label: 'LGPD' },
  { id: 'admin', icon: UserCog, label: 'Admin' },
  { id: 'themes', icon: Palette, label: 'Skins' },
  { id: 'docs', icon: BookOpen, label: 'Documentação' },
] as const;

// ── Advanced / Admin-only (accessible via Admin view or ⌘K search) ──
export const advancedNav: readonly NavItemConfig[] = [
  { id: 'audit-logs', icon: ScrollText, label: 'Auditoria' },
  { id: 'auto-export', icon: ClipboardList, label: 'Export Auto' },
  { id: 'transcriptions', icon: Mic, label: 'Transcrições' },
  { id: 'diagnostics', icon: Compass, label: 'Diagnóstico' },
  { id: 'performance', icon: Cpu, label: 'Performance' },
  { id: 'telemetry', icon: BarChartHorizontal, label: 'Telemetria BD' },
  { id: 'failed-messages', icon: AlertTriangle, label: 'DLQ — Falhas envio', requiredRoles: ['admin', 'supervisor'] },
  { id: 'webhook-events', icon: Webhook, label: 'Webhook Events' },
  { id: 'ai-usage', icon: BrainCircuit, label: 'Consumo IA' },
  { id: 'public-api', icon: Code2, label: 'API Pública' },
  { id: 'gmail-webhook', icon: Webhook, label: 'Gmail Webhook' },
  { id: 'media-migration', icon: HardDrive, label: 'Migração Mídia' },
  { id: 'sicoob-bridge', icon: Landmark, label: 'Sicoob Bridge' },
  { id: 'evolution-monitor', icon: Activity, label: 'Monitor Evolution' },
  { id: 'webhook-secret', icon: ShieldCheck, label: 'Webhook Secret' },
  { id: 'instance-pauses', icon: Pause, label: 'Pausas de Instância' },
] as const;

// ── Backward-compat re-exports ────────────────────────────
export const communicationNav = automationNav;

// ── Group definitions for collapsible sidebar (≤5 groups) ──
export const sidebarGroups = [
  { label: 'Vendas & CRM', icon: Kanban, items: salesNav },
  { label: 'Automação & IA', icon: Bot, items: automationNav },
  { label: 'Analytics', icon: BarChart3, items: analyticsNav },
  { label: 'Conexões', icon: Plug, items: connectionsNav },
  { label: 'Sistema', icon: Lock, items: systemNav },
] as const;

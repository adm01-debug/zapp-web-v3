/**
 * AgentCard.tsx
 * Display card for an AI agent showing status, model, and actions.
 * Uses agent_status enum correctly.
 */
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Rocket, Archive, RefreshCw, Settings, Eye,
  Cpu, Tag,
} from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { type Agent, AGENT_STATUS_LABELS, AGENT_STATUS_COLORS } from '@/hooks/useAgents';

interface Props {
  agent:             Agent;
  onPromote?:        () => void;
  onDeprecate?:      () => void;
  onEdit?:           () => void;
  onView?:           () => void;
  isLoading?:        boolean;
}

export const AgentCard: React.FC<Props> = ({
  agent, onPromote, onDeprecate, onEdit, onView, isLoading = false,
}) => {
  const statusLabel = AGENT_STATUS_LABELS[agent.status] ?? agent.status;
  const statusColor = AGENT_STATUS_COLORS[agent.status] ?? 'bg-gray-100 text-gray-700';
  const canPromote  = ['configured','testing','staging','review'].includes(agent.status);
  const isProduction = agent.status === 'production';
  const isDeprecated = ['deprecated','archived'].includes(agent.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden="true">{agent.avatar_emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{sanitizeText(agent.name)}</h3>
              {agent.model && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cpu className="h-3 w-3" aria-hidden="true" />
                  {sanitizeText(agent.model)}
                </p>
              )}
            </div>
          </div>
          <Badge className={`text-xs shrink-0 ${statusColor}`}>
            {statusLabel}
          </Badge>
        </div>

        {/* Mission */}
        {agent.mission && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {sanitizeText(agent.mission)}
          </p>
        )}

        {/* Tags */}
        {agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-0.5">
                <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                {sanitizeText(tag)}
              </Badge>
            ))}
            {agent.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{agent.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Version */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v{agent.version}</span>
          <span>{new Date(agent.updated_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-3 flex gap-1.5">
        {onView && (
          <Button variant="ghost" size="sm" onClick={onView} className="gap-1 flex-1" disabled={isLoading}>
            <Eye className="h-3.5 w-3.5" />Ver
          </Button>
        )}
        {onEdit && !isDeprecated && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1 flex-1" disabled={isLoading}>
            <Settings className="h-3.5 w-3.5" />Editar
          </Button>
        )}
        {onPromote && canPromote && (
          <Button variant="default" size="sm" onClick={onPromote} className="gap-1 flex-1" disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            {isProduction ? 'Monitor' : 'Promover'}
          </Button>
        )}
        {onDeprecate && isProduction && (
          <Button variant="outline" size="sm" onClick={onDeprecate} className="gap-1" disabled={isLoading}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AgentCard;

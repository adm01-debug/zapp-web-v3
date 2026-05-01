import { agentRepository, AgentProfile } from '../data-access/agentRepository';

export interface AgentWithStats extends AgentProfile {
  activeChats: number;
  status: 'online' | 'away' | 'offline';
  queues: Array<{ id: string; name: string; color: string }>;
}

export const agentService = {
  getAgentStatus(lastActivity?: string): 'online' | 'away' | 'offline' {
    if (!lastActivity) return 'offline';
    const now = new Date();
    const lastActive = new Date(lastActivity);
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'away';
    return 'offline';
  },

  async getAgentsWithStats(): Promise<AgentWithStats[]> {
    const [profilesResult, [queuesResult, membersResult], chatsResult] = await Promise.all([
      agentRepository.fetchProfiles(),
      agentRepository.fetchQueuesAndMembers(),
      agentRepository.fetchActiveChatsCounts(),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (queuesResult.error) throw queuesResult.error;
    if (membersResult.error) throw membersResult.error;
    if (chatsResult.error) throw chatsResult.error;

    const chatCounts: Record<string, number> = {};
    chatsResult.data?.forEach((contact) => {
      if (contact.assigned_to) {
        chatCounts[contact.assigned_to] = (chatCounts[contact.assigned_to] || 0) + 1;
      }
    });

    return (profilesResult.data as AgentProfile[]).map((profile) => {
      const agentQueues = membersResult.data
        ?.filter((m) => m.profile_id === profile.id)
        .map((m) => {
          const queue = queuesResult.data?.find((q) => q.id === m.queue_id);
          return queue ? { id: queue.id, name: queue.name, color: queue.color } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string; color: string }> || [];

      return {
        ...profile,
        activeChats: chatCounts[profile.id] || 0,
        status: this.getAgentStatus(profile.updated_at),
        queues: agentQueues,
      };
    });
  },
};

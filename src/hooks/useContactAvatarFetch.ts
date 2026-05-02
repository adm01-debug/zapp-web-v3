/**
 * useContactAvatarFetch.ts
 * Auto-fetch WhatsApp profile picture via Evolution API.
 * Solves Gap #3: Avatar shows only initials when no manual photo.
 */
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dbFrom } from '@/integrations/datasource/db';

const avatarCache = new Map<string, string | null>();
const FETCH_COOLDOWN_MS = 60_000 * 30; // 30 min between refetches
const lastFetchTime = new Map<string, number>();

interface UseContactAvatarFetchOptions {
  contactId: string;
  phone: string | null;
  currentAvatarUrl: string | null;
  workspaceId: string;
  instanceName?: string;
}

export function useContactAvatarFetch({
  contactId, phone, currentAvatarUrl, workspaceId, instanceName = 'wpp2',
}: UseContactAvatarFetchOptions) {
  const isFetching = useRef(false);

  const fetchAvatar = useCallback(async (): Promise<string | null> => {
    // Skip if already has avatar or no phone
    if (currentAvatarUrl || !phone || isFetching.current) return currentAvatarUrl;

    // Check cache
    if (avatarCache.has(contactId)) return avatarCache.get(contactId)!;

    // Cooldown check
    const lastFetch = lastFetchTime.get(contactId);
    if (lastFetch && Date.now() - lastFetch < FETCH_COOLDOWN_MS) return null;

    isFetching.current = true;
    lastFetchTime.set(contactId, Date.now());

    try {
      // Call Edge Function that wraps Evolution API fetchProfilePicture
      const { data, error } = await supabase.functions.invoke('fetch-whatsapp-avatar', {
        body: {
          phone,
          instance_name: instanceName,
          contact_id: contactId,
          workspace_id: workspaceId,
        },
      });

      if (error) throw error;

      const avatarUrl = data?.avatar_url ?? null;
      avatarCache.set(contactId, avatarUrl);

      // Persist to contact record if we got a URL
      if (avatarUrl) {
        await dbFrom('contacts')
          .update({ avatar_url: avatarUrl })
          .eq('id', contactId)
          .eq('workspace_id', workspaceId);
      }

      return avatarUrl;
    } catch (err) {
      console.warn('[AvatarFetch] Failed for', contactId, err);
      avatarCache.set(contactId, null);
      return null;
    } finally {
      isFetching.current = false;
    }
  }, [contactId, phone, currentAvatarUrl, workspaceId, instanceName]);

  return { fetchAvatar };
}

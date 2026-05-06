import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  metadata: Record<string, any>;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, enabled, metadata");
      
      if (error) throw error;
      
      return (data || []).reduce((acc, flag) => {
        acc[flag.key] = { enabled: flag.enabled, metadata: flag.metadata };
        return acc;
      }, {} as Record<string, { enabled: boolean; metadata: Record<string, any> }>);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFlag(key: string) {
  const { data: flags } = useFeatureFlags();
  return flags?.[key]?.enabled ?? false;
}

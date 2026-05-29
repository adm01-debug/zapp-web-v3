// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  metadata: any;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("name, enabled, metadata");
      
      if (error) throw error;
      
      return (data || []).reduce((acc, flag) => {
        acc[flag.name] = { enabled: flag.enabled, metadata: flag.metadata };
        return acc;
      }, {} as Record<string, { enabled: boolean; metadata: any }>);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFlag(name: string) {
  const { data: flags } = useFeatureFlags();
  return flags?.[name]?.enabled ?? false;
}
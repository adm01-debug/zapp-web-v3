import { useState, useEffect, useCallback } from 'react';
import { 
  PRESETS, 
  CSS_VARS_TO_APPLY, 
  STORAGE_KEY, 
  DEFAULT_PRESET_ID,
  normalizeStoredPresetId 
} from './presets';
import type { ThemeModeColors } from './presets';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('useThemePreset');

export function useThemePreset() {
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  
  const [activePreset, setActivePreset] = useState<string>(DEFAULT_PRESET_ID);
  const [borderRadius, setBorderRadius] = useState<number>(8);

  // Load initial state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActivePreset(normalizeStoredPresetId(parsed.preset));
        if (parsed.borderRadius != null) setBorderRadius(parsed.borderRadius);
      } catch (e) {
        log.error('Failed to parse theme config', e);
      }
    }
  }, []);

  // Sync with Database if user is logged in
  useEffect(() => {
    if (!user) return;

    const syncFromDb = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('theme_config')
        .eq('id', user.id)
        .single();

      if (data?.theme_config) {
        const config = data.theme_config as any;
        if (config.preset) setActivePreset(normalizeStoredPresetId(config.preset));
        if (config.borderRadius != null) setBorderRadius(config.borderRadius);
      }
    };

    syncFromDb();
  }, [user]);

  const saveToDb = useCallback(async (config: any) => {
    if (!user) return;
    
    await supabase
      .from('profiles')
      .update({ theme_config: config })
      .eq('id', user.id);
  }, [user]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePreset(presetId);
    
    const config = {
      preset: presetId,
      borderRadius: preset.borderRadius ?? borderRadius
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    saveToDb(config);
    
    if (preset.borderRadius != null) {
      setBorderRadius(preset.borderRadius);
    }
  }, [borderRadius, saveToDb]);

  const handleBorderRadiusChange = useCallback((value: number[]) => {
    const newRadius = value[0];
    setBorderRadius(newRadius);
    
    const config = {
      preset: activePreset,
      borderRadius: newRadius
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    saveToDb(config);
  }, [activePreset, saveToDb]);

  const resetTheme = useCallback(() => {
    const config = {
      preset: DEFAULT_PRESET_ID,
      borderRadius: 8
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    saveToDb(config);
    setActivePreset(DEFAULT_PRESET_ID);
    setBorderRadius(8);
  }, [saveToDb]);

  return {
    activePreset,
    borderRadius,
    applyPreset,
    handleBorderRadiusChange,
    resetTheme
  };
}

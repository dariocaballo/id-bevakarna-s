import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CelebrationSettings {
  celebration_enabled: boolean;
  show_bubble: boolean;
  show_confetti: boolean;
  play_sound: boolean;
  special_effect: boolean;
}

// Cache för inställningar
let settingsCache: CelebrationSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minuter

export const useCelebrationSettings = () => {
  const [settings, setSettings] = useState<CelebrationSettings>({
    celebration_enabled: true,
    show_bubble: true,
    show_confetti: true,
    play_sound: true,
    special_effect: true
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      // Använd cache om giltig och inte force refresh
      if (!forceRefresh && settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Using cached celebration settings');
        setSettings(settingsCache);
        setLoading(false);
        return settingsCache;
      }

      console.log('🔄 Loading fresh celebration settings');
      setLoading(true);

      const { data, error } = await supabase
        .from('dashboard_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'celebration_enabled',
          'show_bubble', 
          'show_confetti',
          'play_sound',
          'special_effect'
        ]);

      if (error) throw error;

      // Konvertera till objekt
      const settingsObj: any = {};
      data?.forEach(item => {
        settingsObj[item.setting_key] = item.setting_value;
      });

      const newSettings: CelebrationSettings = {
        celebration_enabled: settingsObj.celebration_enabled ?? true,
        show_bubble: settingsObj.show_bubble ?? true,
        show_confetti: settingsObj.show_confetti ?? true,
        play_sound: settingsObj.play_sound ?? true,
        special_effect: settingsObj.special_effect ?? true
      };

      // Uppdatera cache
      settingsCache = newSettings;
      cacheTimestamp = now;
      
      setSettings(newSettings);
      console.log('✅ Celebration settings loaded:', newSettings);
      
      return newSettings;
    } catch (error) {
      console.error('❌ Error loading celebration settings:', error);
      return settings; // Returnera nuvarande settings vid fel
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const updateSetting = useCallback(async (key: keyof CelebrationSettings, value: boolean) => {
    try {
      console.log(`🔧 Updating ${key} to ${value}`);

      const { error } = await supabase
        .from('dashboard_settings')
        .upsert({
          setting_key: key,
          setting_value: value
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      // Uppdatera lokalt state och cache
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      settingsCache = newSettings;
      cacheTimestamp = Date.now();

      console.log(`✅ Updated ${key} successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating ${key}:`, error);
      return false;
    }
  }, [settings]);

  // Ladda inställningar vid start
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    loadSettings,
    updateSetting
  };
};
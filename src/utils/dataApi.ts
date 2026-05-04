import { supabase } from '@/integrations/supabase/client';

export async function dataApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('data-api', {
    body: { action, ...payload }
  });

  if (error) {
    throw new Error(error.message || 'Kunde inte ansluta till servern');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}
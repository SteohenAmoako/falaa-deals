
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUserApiKey(userId: string) {
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.api_key || null;
}

export async function regenerateApiKey(userId: string) {
  try {
    const newKey = `fd_${crypto.randomBytes(24).toString('hex')}`;

    // Deactivate old keys
    await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Create new key
    const { error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        api_key: newKey,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    revalidatePath('/dashboard/api-docs');
    return { success: true, api_key: newKey };
  } catch (error: any) {
    console.error('API Key Regen Error:', error);
    return { success: false, message: error.message };
  }
}

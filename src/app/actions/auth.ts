
'use server';

import { supabase } from '@/lib/supabase';
import { generateReferenceCode } from '@/lib/supabase';

export async function signUp(formData: { email: string; password: string; fullName: string; phone: string }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed');

    // Create profile record in public.profiles using the provided schema
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      full_name: formData.fullName,
      phone: formData.phone,
      reference_code: generateReferenceCode(),
      wallet_balance: 0.00,
      is_admin: false
    });

    if (profileError) {
      console.error('Profile Creation Error:', profileError);
      throw new Error('Could not create user profile.');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Signup Error:', error);
    return { success: false, message: error.message };
  }
}

export async function signIn(formData: { email: string; password: string }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('SignIn Error:', error);
    return { success: false, message: error.message };
  }
}

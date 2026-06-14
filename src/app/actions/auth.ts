
'use server';

import { supabase } from '@/lib/supabase';
import { generateReferenceCode } from '@/lib/supabase';

/**
 * Handles user registration.
 * Note: To avoid verification limits, go to Supabase Dashboard > Auth > Settings and disable "Confirm email".
 */
export async function signUp(formData: { email: string; password: string; fullName: string; phone: string }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed. Check if email confirmation is required in Supabase settings.');

    // Create profile record in public.profiles using your provided schema
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
      // If profile fails, we might want to clean up auth user, but for now we throw
      throw new Error('User created but profile setup failed.');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Signup Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Handles user login.
 */
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

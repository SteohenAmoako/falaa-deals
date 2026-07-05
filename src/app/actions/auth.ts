'use server';

import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sendNtfy } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function signUp(formData: { email: string; password: string; fullName: string; phone: string }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      if (authError.message.includes('rate limit exceeded')) {
        throw new Error('Supabase email limit reached. Please disable "Confirm email" in your Supabase Auth settings.');
      }
      throw authError;
    }

    if (!authData.user) throw new Error('Signup failed. Check your Supabase configuration.');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        wallet_balance: 0.00,
        is_admin: false
      })
      .select('reference_code')
      .single();

    if (profileError) {
      console.error('Profile Creation Error:', profileError);
      throw new Error('User created but profile setup failed: ' + profileError.message);
    }

    await sendNtfy({
      title: `${formData.fullName} (${profile?.reference_code}): New User`,
      tags: ["user", "signup"],
      data: {
        userId: authData.user.id,
        email: formData.email,
        phone: formData.phone,
        ref: profile?.reference_code,
        timestamp: new Date().toISOString()
      }
    });

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

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please disable "Confirm email" in your Supabase Auth settings.');
      }
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('SignIn Error:', error);
    return { success: false, message: error.message };
  }
}

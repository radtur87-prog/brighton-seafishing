import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Fallback values let the app run with zero .env setup (StackBlitz, quick demos, etc.).
// The anon key is a public, RLS-protected key — safe to ship in client code.
// Override via EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY for a different project.
const DEFAULT_SUPABASE_URL = 'https://rkklwfhkfpezgniquasf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra2x3ZmhrZnBlemduaXF1YXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MjM4NjIsImV4cCI6MjEwNzQ5OTg2Mn0.kHJdBCr2T0Df45mCECt4frOzvm4YAp152-6_616dMc0';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

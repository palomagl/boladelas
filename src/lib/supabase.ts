import {createClient, type SupabaseClient} from '@supabase/supabase-js';

// Esta conexão só deve ser ativada depois da migração SQL,
// da autorização da única administradora e da integração de persistência.
const url=import.meta.env.VITE_SUPABASE_URL;
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured=Boolean(url&&publishableKey);
export const supabase:SupabaseClient|null=isSupabaseConfigured
 ?createClient(url,publishableKey,{auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:false
  }})
 :null;

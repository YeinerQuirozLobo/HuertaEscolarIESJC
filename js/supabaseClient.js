import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhjfofucyvlesahsekzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oamZvZnVjeXZsZXNhaHNla3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzM2NjMsImV4cCI6MjA3NDE0OTY2M30.wDV6wH5pfqSzs6FSkArucqIWS2Q5_PvyczNLQ0_mJZk";

// Configuración avanzada para garantizar que la sesión persista
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Estas son configuraciones predeterminadas pero útiles
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Usamos el almacenamiento de cookies para mayor confiabilidad
    storage: {
      setItem: (key, value) => document.cookie = `${key}=${value};path=/;secure;samesite=Lax`,
      getItem: (key) => {
        const name = key + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for(let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) == ' ') {
            c = c.substring(1);
          }
          if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
          }
        }
        return "";
      },
      removeItem: (key) => document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`,
    }
  },
});

console.log("✅ Cliente Supabase inicializado");
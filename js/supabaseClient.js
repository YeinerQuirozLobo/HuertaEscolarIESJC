// js/supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhjfofucyvlesahsekzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oamZvZnVjeXZsZXNhaHNla3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzM2NjMsImV4cCI6MjA3NDE0OTY2M30.wDV6wH5pfqSzs6FSkArucqIWS2Q5_PvyczNLQ0_mJZk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storageKey: 'supabase-auth-cookie', // Use a custom key
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: { // Explicitly tell Supabase to use a cookie-based storage
            setItem: (key, value) => document.cookie = `${key}=${value}`,
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
            removeItem: (key) => document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC`,
        }
    },
    realtime: {
        enabled: true
    }
});

console.log("✅ Cliente Supabase inicializado");
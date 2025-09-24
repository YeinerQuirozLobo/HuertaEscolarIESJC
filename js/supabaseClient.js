import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mhjfofucyvlesahsekzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oamZvZnVjeXZsZXNhaHNla3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzM2NjMsImV4cCI6MjA3NDE0OTY2M30.wDV6wH5pfqSzs6FSkArucqIWS2Q5_PvyczNLQ0_mJZk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true, // Esto es crucial
    },
});

console.log("✅ Cliente Supabase inicializado");
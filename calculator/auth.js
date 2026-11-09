import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
export const supabase = createClient(
  "https://gtuycqunlihegsbvvsol.supabase.co",
  "sb_publishable_zFqzEsppitLusrbVtSakQQ_plPLsg-C",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

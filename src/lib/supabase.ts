import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://bslrpphcpzeuxbbvyrui.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.error("Warning: SUPABASE_ANON_KEY not set. Set it via environment variable.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

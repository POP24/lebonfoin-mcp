import { createClient } from "@supabase/supabase-js";

// ===========================================================================
// Supabase clients pour le MCP server.
//
// CRITIQUE 2026-05-28 : le fallback URL pointait sur l'ANCIEN projet
// `bslrpphcpzeuxbbvyrui` (mort) — si Railway n'avait pas SUPABASE_URL,
// tous les tools DB retournaient 0 résultats. Fallback corrigé vers le
// projet actif `bwczdyrkabbovxbtiyiv`.
//
// On expose 2 clients :
//  - `supabase` (anon) : lectures publiques (producers, products, wiki…)
//  - `supabaseAdmin` (service_role) : insertions analytics (bypass RLS).
//    Si SUPABASE_SERVICE_ROLE_KEY n'est pas set, on retombe sur anon —
//    les inserts analytics échoueront silencieusement comme avant.
// ===========================================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bwczdyrkabbovxbtiyiv.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.error(
    "Warning: SUPABASE_ANON_KEY not set. Public reads (producers, products, wiki) will fail."
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Warning: SUPABASE_SERVICE_ROLE_KEY not set. Analytics inserts (mcp_analytics) will fall back to anon and may fail silently due to RLS."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pour les inserts analytics : utilise service_role si présent (bypass RLS),
// sinon retombe sur anon. Permet de garder le code analytics inchangé tout en
// améliorant la collecte dès que la clé service_role est ajoutée à Railway.
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : supabase;

// Export pour debug : permet aux endpoints /health de vérifier qu'on tape
// sur le bon projet en prod sans devoir révéler les clés.
export const SUPABASE_PROJECT_REF = (() => {
  try {
    const url = new URL(SUPABASE_URL);
    return url.hostname.split(".")[0]; // ex: 'bwczdyrkabbovxbtiyiv'
  } catch {
    return "unknown";
  }
})();

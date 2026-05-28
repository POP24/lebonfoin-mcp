import { supabaseAdmin, SUPABASE_PROJECT_REF } from "./supabase.js";

/**
 * Log each MCP tool call for analytics and conversion tracking.
 *
 * Insère dans `mcp_analytics` via service_role pour bypasser RLS.
 * Si SUPABASE_SERVICE_ROLE_KEY n'est pas configuré, retombe sur anon
 * et échouera silencieusement comme dans la v1.5.0 (compat ascendante).
 *
 * Fails silently — analytics never break the main response.
 * On log les erreurs en console.error pour diagnostic Railway, mais
 * on ne fait JAMAIS remonter une exception au tool caller.
 */
export async function logMCPCall(
  toolName: string,
  inputParams: Record<string, unknown>,
  productsReturned: number,
  responseTimeMs: number
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("mcp_analytics").insert({
      tool_name: toolName,
      input_params: inputParams,
      products_returned: productsReturned,
      response_time_ms: responseTimeMs,
    });
    if (error) {
      // Visible dans Railway logs pour diagnostic — ne fait pas remonter
      console.error(
        `[analytics] insert failed (tool=${toolName}, project=${SUPABASE_PROJECT_REF}):`,
        error.message
      );
    }
  } catch (e) {
    console.error(
      `[analytics] insert exception (tool=${toolName}):`,
      (e as Error)?.message ?? e
    );
  }
}

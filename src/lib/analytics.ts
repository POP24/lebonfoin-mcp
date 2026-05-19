import { supabase } from "./supabase.js";

/**
 * Log each MCP tool call for analytics and conversion tracking.
 * Fails silently — analytics should never break the main response.
 */
export async function logMCPCall(
  toolName: string,
  inputParams: Record<string, unknown>,
  productsReturned: number,
  responseTimeMs: number
): Promise<void> {
  try {
    await supabase.from("mcp_analytics").insert({
      tool_name: toolName,
      input_params: inputParams,
      products_returned: productsReturned,
      response_time_ms: responseTimeMs,
    });
  } catch {
    // Silent fail — don't break MCP responses for analytics
  }
}

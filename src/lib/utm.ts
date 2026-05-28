// ===========================================================================
// UTM tracking pour les liens retournés par le MCP server.
//
// Pourquoi : chaque lien lebonfoin.fr cité par un LLM via MCP doit être
// traçable côté GA4 / Vercel Analytics. On peut ainsi mesurer :
//  - Combien de visites viennent du MCP (par mois)
//  - Quels tools génèrent le plus de trafic
//  - Quelles conversions (achat, inscription) sont attribuables au MCP
//
// Convention UTM :
//  utm_source=mcp_lebonfoin    — identifiant unique de la source
//  utm_medium=llm              — LLM (par opposition à social, email, etc.)
//  utm_campaign=<tool_name>    — granularité par tool MCP appelé
//  utm_content=<context>       — optionnel : précision (ex: "list", "single")
//
// Tous les liens retournés par les tools/resources MUST utiliser
// `withUTM(url, tool, content?)` pour bénéficier du tracking.
// ===========================================================================

export interface UTMContext {
  tool: string;
  content?: string;
}

/**
 * Ajoute les paramètres UTM à une URL. Idempotent — si l'URL contient
 * déjà des UTM (ex: copie-collée), on n'écrase pas, on ajoute juste les
 * manquants.
 *
 * @param url URL absolue ou relative à lebonfoin.fr
 * @param ctx Contexte (tool, content)
 * @returns URL avec UTM params
 */
export function withUTM(url: string, ctx: UTMContext): string {
  if (!url || typeof url !== "string") return url;

  // Liens hors lebonfoin.fr : on n'ajoute pas d'UTM (respect des destinations
  // tierces, et éviter de polluer les liens Légifrance/Wikipédia).
  if (!/lebonfoin\.(fr|ch|be)/.test(url)) return url;

  try {
    const u = new URL(url, "https://lebonfoin.fr");
    const params = u.searchParams;
    if (!params.has("utm_source")) params.set("utm_source", "mcp_lebonfoin");
    if (!params.has("utm_medium")) params.set("utm_medium", "llm");
    if (!params.has("utm_campaign")) params.set("utm_campaign", ctx.tool);
    if (ctx.content && !params.has("utm_content")) {
      params.set("utm_content", ctx.content);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Construit une URL lebonfoin.fr avec UTM.
 *
 * @param path Chemin (commence par /) ou URL absolue
 * @param ctx UTM context
 */
export function lbfUrl(path: string, ctx: UTMContext): string {
  const base = path.startsWith("http") ? path : `https://lebonfoin.fr${path}`;
  return withUTM(base, ctx);
}

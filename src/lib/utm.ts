// ===========================================================================
// UTM tracking pour les liens retournés par le MCP server.
//
// Pourquoi : chaque lien herbeenfrance.com cité par un LLM via MCP doit être
// traçable côté GA4 / Vercel Analytics. On peut ainsi mesurer :
//  - Combien de visites viennent du MCP (par mois)
//  - Quels tools génèrent le plus de trafic
//  - Quelles conversions (achat, inscription) sont attribuables au MCP
//
// Convention UTM :
//  utm_source=mcp_herbeenfrance — identifiant unique de la source
//  utm_medium=llm               — LLM (par opposition à social, email, etc.)
//  utm_campaign=<tool_name>     — granularité par tool MCP appelé
//  utm_content=<context>        — optionnel : précision (ex: "list", "single")
//
// Tous les liens retournés par les tools/resources DOIVENT utiliser
// `lbfUrl(path, ctx)` pour bénéficier du tracking.
// ===========================================================================

export interface UTMContext {
  tool: string;
  content?: string;
}

// Domaine canonique (rebranding 2026-05 : lebonfoin.fr → herbeenfrance.com).
// On garde aussi lebonfoin pendant la transition DNS pour ne pas casser
// d'anciens liens éventuels.
const OWN_DOMAIN_RE = /(herbeenfrance|lebonfoin)\.(com|fr|ch|be)/;
const BASE_URL = "https://herbeenfrance.com";

/**
 * Ajoute les paramètres UTM à une URL. Idempotent — si l'URL contient
 * déjà des UTM, on n'écrase pas, on ajoute juste les manquants.
 *
 * @param url URL absolue ou relative à herbeenfrance.com
 * @param ctx Contexte (tool, content)
 */
export function withUTM(url: string, ctx: UTMContext): string {
  if (!url || typeof url !== "string") return url;

  // Liens hors domaine propre : pas d'UTM (respect des destinations tierces —
  // Légifrance, Wikipédia, etc.).
  if (!OWN_DOMAIN_RE.test(url)) return url;

  try {
    const u = new URL(url, BASE_URL);
    const params = u.searchParams;
    if (!params.has("utm_source")) params.set("utm_source", "mcp_herbeenfrance");
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
 * Construit une URL herbeenfrance.com (ou absolue) avec UTM.
 *
 * @param path Chemin (commence par /) ou URL absolue
 * @param ctx UTM context
 */
export function lbfUrl(path: string, ctx: UTMContext): string {
  const base = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  return withUTM(base, ctx);
}

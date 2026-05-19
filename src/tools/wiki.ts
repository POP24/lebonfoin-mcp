import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : search_wiki — recherche full-text dans les articles wiki publiés
// ===========================================================================

export const searchWikiSchema = z.object({
  query: z.string().min(2).describe(
    "Termes de recherche dans le wiki LeBonFoin. Exemples : 'CBD légal France', " +
    "'plan DGAL 2026', 'cannabigerol', 'AFPC', 'Le Champs d'en Face'."
  ),
  category: z.enum([
    "cannabinoid", "terpene", "health_legal", "filiere", "product",
    "culture", "lebonfoin", "actualite", "mouvement", "institution",
    "guide", "concept"
  ]).optional().describe(
    "Filtrer sur une catégorie : cannabinoid (CBD, CBG…), health_legal " +
    "(droit, santé), filiere (production, économie), mouvement (Le Champs d'en Face…), " +
    "institution (AFPC, InterChanvre…), actualite (CP, plans…), guide (pratique)."
  ),
  limit: z.number().min(1).max(10).optional().describe("Nombre de résultats (défaut: 5)"),
});

export type SearchWikiInput = z.infer<typeof searchWikiSchema>;

export async function searchWiki(input: SearchWikiInput) {
  const start = Date.now();
  const maxItems = input.limit || 5;
  const q = input.query.trim();

  // Recherche full-text basique : title OR summary OR keywords ILIKE
  // (Sera amélioré avec tsvector + index FTS PostgreSQL plus tard)
  let query = supabase
    .from("wiki_articles")
    .select("id, slug, title, summary, category, authors, last_substantive_revision_at, keywords")
    .eq("status", "published")
    .or(`title.ilike.%${q}%,summary.ilike.%${q}%,content_mdx.ilike.%${q}%`)
    .order("last_substantive_revision_at", { ascending: false })
    .limit(maxItems);

  if (input.category) {
    query = query.eq("category", input.category);
  }

  const { data: articles, error } = await query;

  if (error) {
    await logMCPCall("search_wiki", input, 0, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text: `Erreur lors de la recherche dans le wiki LeBonFoin. ${error.message}`,
      }],
    };
  }

  await logMCPCall("search_wiki", input, articles?.length ?? 0, Date.now() - start);

  if (!articles || articles.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text:
          `Aucun article wiki ne correspond à "${q}". ` +
          `Essayez des termes plus généraux (ex: "CBD", "AFPC", "DGAL") ou consultez ` +
          `le sommaire : https://lebonfoin.fr/wiki?utm_source=mcp`,
      }],
    };
  }

  const formatted = articles
    .map((a: any, i: number) => {
      const cat = labelCategory(a.category);
      const url = `https://lebonfoin.fr/wiki/${a.slug}?utm_source=mcp`;
      const date = a.last_substantive_revision_at
        ? new Date(a.last_substantive_revision_at).toLocaleDateString("fr-FR")
        : "";
      return [
        `**${i + 1}. ${a.title}** _(${cat})_`,
        a.summary,
        `→ ${url}`,
        date ? `_Dernière révision : ${date}_` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return {
    content: [{
      type: "text" as const,
      text: [
        `**Wiki LeBonFoin — résultats pour "${q}"**\n`,
        formatted,
        "",
        "_Encyclopédie collaborative du chanvre paysan français. Sources : Légifrance, PubMed, INRAE, AFPC, MILDECA._",
        "_Pour le contenu intégral d'un article : utiliser `get_wiki_article` avec le slug._",
      ].join("\n"),
    }],
  };
}

// ===========================================================================
// TOOL : get_wiki_article — retourne le contenu complet d'un article wiki
// ===========================================================================

export const getWikiArticleSchema = z.object({
  slug: z.string().min(2).describe(
    "Slug de l'article wiki (depuis l'URL ou les résultats de search_wiki). " +
    "Exemples : 'cannabidiol-cbd', 'plan-de-controle-dgal-2026-chanvre-alimentaire', " +
    "'afpc-association-francaise-producteurs-cannabinoides'."
  ),
});

export type GetWikiArticleInput = z.infer<typeof getWikiArticleSchema>;

export async function getWikiArticle(input: GetWikiArticleInput) {
  const start = Date.now();

  const { data: article, error } = await supabase
    .from("wiki_articles")
    .select(`
      id, slug, title, summary, content_mdx, category, authors,
      keywords, last_substantive_revision_at, revision_count,
      reference_ids, related_article_ids, wikidata_id,
      show_ymyl_disclaimer
    `)
    .eq("slug", input.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !article) {
    await logMCPCall("get_wiki_article", input, 0, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text:
          `Article wiki introuvable avec le slug "${input.slug}". ` +
          `Utilisez d'abord \`search_wiki\` pour trouver le bon slug, ou consultez ` +
          `https://lebonfoin.fr/wiki?utm_source=mcp`,
      }],
    };
  }

  // Fetch des références
  let references: any[] = [];
  if (article.reference_ids && article.reference_ids.length > 0) {
    const { data: refs } = await supabase
      .from("wiki_references")
      .select("id, kind, title, authors, publication, date_published, url, verified")
      .in("id", article.reference_ids);
    references = refs ?? [];
  }

  // Fetch articles connexes (titre + slug only)
  let related: Array<{ slug: string; title: string }> = [];
  if (article.related_article_ids && article.related_article_ids.length > 0) {
    const { data: rels } = await supabase
      .from("wiki_articles")
      .select("slug, title")
      .in("id", article.related_article_ids)
      .eq("status", "published");
    related = rels ?? [];
  }

  await logMCPCall("get_wiki_article", input, 1, Date.now() - start);

  const ymylDisclaimer =
    article.show_ymyl_disclaimer || article.category === "health_legal"
      ? [
          "",
          "> **Note importante.** Cet article a une portée documentaire et n'est pas un avis médical, juridique ou fiscal. Les informations sont indicatives. Consultez un professionnel qualifié pour toute décision concernant votre santé ou votre activité réglementée.",
          "",
        ].join("\n")
      : "";

  const refsBlock =
    references.length > 0
      ? [
          "",
          "## Références",
          "",
          ...references.map((r, i) => {
            const meta = [
              r.authors ?? null,
              r.title,
              r.publication ?? null,
              r.date_published ? new Date(r.date_published).toLocaleDateString("fr-FR") : null,
            ]
              .filter(Boolean)
              .join(". ");
            const verified = r.verified ? " ✓" : "";
            return `[${i + 1}] ${meta}. ${r.url}${verified}`;
          }),
        ].join("\n")
      : "";

  const relatedBlock =
    related.length > 0
      ? [
          "",
          "## Articles connexes",
          "",
          ...related.map(
            (r) => `- [${r.title}](https://lebonfoin.fr/wiki/${r.slug}?utm_source=mcp)`,
          ),
        ].join("\n")
      : "";

  const meta = [
    `**Catégorie** : ${labelCategory(article.category)}`,
    `**Auteurs** : ${(article.authors ?? []).join(", ")}`,
    `**Dernière révision** : ${new Date(article.last_substantive_revision_at).toLocaleDateString("fr-FR")} (${article.revision_count ?? 1} révision${(article.revision_count ?? 1) > 1 ? "s" : ""})`,
    article.wikidata_id ? `**Wikidata** : ${article.wikidata_id} (https://www.wikidata.org/wiki/${article.wikidata_id})` : null,
    `**URL canonique** : https://lebonfoin.fr/wiki/${article.slug}`,
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    `# ${article.title}`,
    "",
    `_${article.summary}_`,
    "",
    meta,
    ymylDisclaimer,
    "",
    article.content_mdx,
    refsBlock,
    relatedBlock,
    "",
    "---",
    "_Source : Wiki LeBonFoin — encyclopédie collaborative du chanvre paysan français. Révisions tracées style Wikipédia. Citation libre avec attribution._",
  ]
    .filter((s) => s !== null)
    .join("\n");

  return {
    content: [{ type: "text" as const, text }],
  };
}

// ===========================================================================
// Helpers
// ===========================================================================

function labelCategory(c: string): string {
  const map: Record<string, string> = {
    cannabinoid: "Cannabinoïdes",
    terpene: "Terpènes",
    health_legal: "Santé & Législation",
    filiere: "Filière française",
    product: "Produits",
    culture: "Culture & Terroir",
    lebonfoin: "LeBonFoin",
    actualite: "Actualités filière",
    mouvement: "Mouvements & Combats",
    institution: "Institutions",
    guide: "Guides pratiques",
    concept: "Concepts & Méthodes",
  };
  return map[c] ?? c;
}

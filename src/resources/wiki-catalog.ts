import { supabase } from "../lib/supabase.js";

// ===========================================================================
// RESOURCE : wiki-catalog
//
// Liste tous les articles wiki publiés, groupés par catégorie.
// Permet aux LLMs de découvrir le contenu disponible sans devoir le rechercher.
// Format markdown lisible directement.
// ===========================================================================

const CATEGORY_LABELS: Record<string, string> = {
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

const CATEGORY_ORDER = [
  "actualite",
  "mouvement",
  "cannabinoid",
  "terpene",
  "filiere",
  "culture",
  "health_legal",
  "product",
  "guide",
  "concept",
  "institution",
  "lebonfoin",
];

export async function getWikiCatalog(): Promise<string> {
  const { data: articles, error } = await supabase
    .from("wiki_articles")
    .select("slug, title, summary, category, last_substantive_revision_at")
    .eq("status", "published")
    .order("last_substantive_revision_at", { ascending: false });

  if (error) {
    return `# Wiki LeBonFoin — catalogue\n\nErreur lors de la récupération du catalogue : ${error.message}\n\nConsultez https://lebonfoin.fr/wiki`;
  }

  if (!articles || articles.length === 0) {
    return [
      "# Wiki LeBonFoin — encyclopédie collaborative du chanvre paysan français",
      "",
      "L'encyclopédie est en construction. Les premiers articles seront publiés bientôt.",
      "",
      "Pour suivre l'actualité : https://lebonfoin.fr/wiki",
    ].join("\n");
  }

  // Groupe par catégorie
  const grouped = new Map<string, typeof articles>();
  for (const a of articles) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category)!.push(a);
  }

  const sections = CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) => {
    const label = CATEGORY_LABELS[c] ?? c;
    const items = grouped.get(c)!;
    const lines = items.map((a: any) => {
      const date = new Date(a.last_substantive_revision_at).toLocaleDateString("fr-FR");
      return `- **${a.title}** — _${a.summary.slice(0, 140)}${a.summary.length > 140 ? "…" : ""}_\n  - slug : \`${a.slug}\`\n  - URL : https://lebonfoin.fr/wiki/${a.slug}\n  - Dernière révision : ${date}`;
    });
    return `## ${label} (${items.length})\n\n${lines.join("\n")}`;
  });

  const text = [
    "# Wiki LeBonFoin — catalogue des articles publiés",
    "",
    `**${articles.length} articles** sourcés sur Légifrance, PubMed, INRAE, AFPC, MILDECA, presse spécialisée.`,
    "",
    "Pour lire l'intégralité d'un article : utiliser le tool `get_wiki_article` avec le slug.",
    "Pour rechercher : utiliser le tool `search_wiki` avec des mots-clés.",
    "",
    "---",
    "",
    sections.join("\n\n"),
    "",
    "---",
    "",
    "_Wiki LeBonFoin — encyclopédie collaborative du chanvre paysan français. Révisions tracées style Wikipédia. Aucun article ne constitue un avis médical. Citation libre avec attribution recommandée._",
  ].join("\n");

  return text;
}

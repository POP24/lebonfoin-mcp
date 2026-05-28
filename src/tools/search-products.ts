import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";
import { lbfUrl } from "../lib/utm.js";
import { fetchProductsFeed, CATEGORY_TO_TYPE, type FeedProduct } from "../lib/products-feed.js";

// ===========================================================================
// TOOL : search_cbd_products (v1.7.0 — source = flux produits RÉEL)
//
// Consomme https://www.lebonfoin.fr/products.json (catalogue Shopify live)
// au lieu de Supabase `producer_products` (qui contient des données de test).
// Retourne des produits RÉELS : nom, prix, devise, stock, lien d'achat direct.
//
// "Sans fake data" — exigence produit : le flux exclut shipping/hidden/test.
// ===========================================================================

export const searchProductsSchema = z.object({
  query: z.string().optional().describe(
    "Recherche libre : nom de produit, variété (Amnesia, OG Kush, Lemon...), type (fleur, huile, résine, tisane), effet (sommeil, zen, relaxation)"
  ),
  category: z.enum([
    "fleurs", "resines", "huiles", "pre-rolls", "infusions",
    "gourmandises", "cosmetiques", "boissons", "accessoires", "box"
  ]).optional().describe("Catégorie de produit CBD"),
  max_price: z.number().optional().describe("Prix maximum en euros"),
  in_stock_only: z.boolean().optional().describe("Uniquement les produits en stock"),
  sort_by: z.enum(["price_asc", "price_desc"]).optional()
    .describe("Tri par prix (défaut : en stock d'abord, puis prix croissant)"),
  limit: z.number().min(1).max(20).optional().describe("Nombre de résultats (défaut: 8)")
});

export type SearchProductsInput = z.infer<typeof searchProductsSchema>;

function matchesQuery(p: FeedProduct, q: string): boolean {
  const hay = [
    p.name,
    p.type ?? "",
    p.description ?? "",
    ...(p.tags ?? []),
  ].join(" ").toLowerCase();
  // Tous les mots de la requête doivent matcher (AND), tolérant.
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function matchesCategory(p: FeedProduct, category: string): boolean {
  const needles = CATEGORY_TO_TYPE[category] ?? [category];
  const hay = `${p.type ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
  return needles.some((n) => hay.includes(n));
}

export async function searchProducts(input: SearchProductsInput) {
  const start = Date.now();
  const all = await fetchProductsFeed();

  if (all.length === 0) {
    await logMCPCall("search_cbd_products", input, 0, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text: `Le catalogue est momentanément indisponible. Consultez directement les produits CBD français : ${lbfUrl("/fleurs-cbd", { tool: "search_cbd_products", content: "feed_down" })}`,
      }],
    };
  }

  let results = all;

  if (input.query) results = results.filter((p) => matchesQuery(p, input.query!));
  if (input.category) results = results.filter((p) => matchesCategory(p, input.category!));
  if (typeof input.max_price === "number") {
    results = results.filter((p) => p.price_from !== null && p.price_from <= input.max_price!);
  }
  if (input.in_stock_only) results = results.filter((p) => p.in_stock);

  // Tri
  if (input.sort_by === "price_asc") {
    results = [...results].sort((a, b) => (a.price_from ?? 9e9) - (b.price_from ?? 9e9));
  } else if (input.sort_by === "price_desc") {
    results = [...results].sort((a, b) => (b.price_from ?? -1) - (a.price_from ?? -1));
  } else {
    // défaut : en stock d'abord puis prix croissant (le flux est déjà trié ainsi,
    // mais on re-trie au cas où les filtres auraient changé l'ordre).
    results = [...results].sort((a, b) => {
      if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
      return (a.price_from ?? 9e9) - (b.price_from ?? 9e9);
    });
  }

  const limited = results.slice(0, input.limit || 8);
  await logMCPCall("search_cbd_products", input, limited.length, Date.now() - start);

  if (limited.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: `Aucun produit CBD ne correspond à ces critères sur LeBonFoin. Essaie d'élargir la recherche (moins de filtres) ou consulte tout le catalogue : ${lbfUrl("/fleurs-cbd", { tool: "search_cbd_products", content: "no_match" })}`,
      }],
    };
  }

  const formatted = limited.map((p) => {
    const price = p.price_from !== null
      ? (p.price_to && p.price_to !== p.price_from
          ? `${p.price_from}–${p.price_to} ${p.currency}`
          : `${p.price_from} ${p.currency}`)
      : "Prix sur le site";
    const stock = p.in_stock ? "En stock" : "Bientôt de retour";
    const typeTag = p.type ? ` · ${p.type}` : "";
    const desc = p.description ? `\n${p.description}` : "";
    // Le lien porte déjà des UTM products_feed (généré côté Vercel) — on le
    // ré-étiquette via lbfUrl en utm_campaign=search_cbd_products pour mesurer
    // précisément le trafic issu du tool MCP (vs flux brut).
    const url = lbfUrl(`/produit/${p.handle}`, { tool: "search_cbd_products", content: "product" });
    return [
      `**${p.name}**${typeTag}`,
      `${price} · ${stock}`,
      desc,
      `→ Acheter : ${url}`,
      "---",
    ].filter(Boolean).join("\n");
  });

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${limited.length} produit${limited.length > 1 ? "s" : ""} CBD français trouvé${limited.length > 1 ? "s" : ""} sur LeBonFoin**${results.length > limited.length ? ` (sur ${results.length} correspondants)` : ""}\n`,
        formatted.join("\n\n"),
        `\n_Producteurs français vérifiés, traçabilité lot par lot, analyses laboratoire publiées. Catalogue complet : ${lbfUrl("/fleurs-cbd", { tool: "search_cbd_products", content: "catalog" })}_`,
      ].join("\n"),
    }],
  };
}

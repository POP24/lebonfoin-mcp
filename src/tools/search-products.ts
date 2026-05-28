import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";
import { lbfUrl } from "../lib/utm.js";
import type { ProductResult } from "../lib/types.js";

export const searchProductsSchema = z.object({
  query: z.string().optional().describe(
    "Recherche libre : nom de produit, variete (Amnesia, OG Kush...), effet recherche (sommeil, relaxation, douleur)"
  ),
  category: z.enum([
    "fleurs", "resines", "huiles", "pre-rolls", "infusions",
    "gourmandises", "cosmetiques", "boissons", "accessoires", "box"
  ]).optional().describe("Categorie de produit CBD"),
  max_price: z.number().optional().describe("Prix maximum en euros par gramme"),
  culture_method: z.enum(["indoor", "outdoor", "greenhouse", "mixte"]).optional()
    .describe("Methode de culture"),
  bio_only: z.boolean().optional().describe("Uniquement produits certifies bio"),
  region: z.string().optional().describe("Region ou departement du producteur (ex: Dordogne, Nouvelle-Aquitaine)"),
  sort_by: z.enum(["price_asc", "price_desc", "rating", "newest"]).optional()
    .describe("Tri des resultats"),
  limit: z.number().min(1).max(20).optional().describe("Nombre de resultats (defaut: 8)")
});

export type SearchProductsInput = z.infer<typeof searchProductsSchema>;

export async function searchProducts(input: SearchProductsInput) {
  const start = Date.now();
  let query = supabase
    .from("producer_products")
    .select(`
      id, shopify_product_id, strain, cbd_rate, thc_rate,
      culture_method, short_description, producer_price, image_url,
      is_bio, terpene_profile, grammages,
      producers!inner(name, slug, department, region, is_bio, average_rating, validation_status, is_active)
    `)
    .eq("is_paused", false)
    .eq("is_out_of_stock", false)
    .eq("producers.is_active", true)
    .eq("producers.validation_status", "approved");

  if (input.culture_method) {
    query = query.eq("culture_method", input.culture_method);
  }

  if (input.bio_only) {
    query = query.eq("is_bio", true);
  }

  if (input.max_price) {
    query = query.lte("producer_price", input.max_price);
  }

  if (input.region) {
    query = query.or(
      `department.ilike.%${input.region}%,region.ilike.%${input.region}%`,
      { referencedTable: "producers" }
    );
  }

  if (input.query) {
    // Search in strain name and description
    const q = input.query.toLowerCase();
    query = query.or(
      `strain.ilike.%${q}%,short_description.ilike.%${q}%`
    );
  }

  // Sorting
  switch (input.sort_by) {
    case "price_asc":
      query = query.order("producer_price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("producer_price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "rating":
    default:
      query = query.order("average_rating", { ascending: false, referencedTable: "producers" });
      break;
  }

  query = query.limit(input.limit || 8);

  const { data, error } = await query;

  if (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Erreur lors de la recherche : ${error.message}`
      }]
    };
  }

  if (!data || data.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: "Aucun produit CBD trouve correspondant a ces criteres sur LeBonFoin.fr. Essayez d'elargir votre recherche (moins de filtres, autre categorie)."
      }]
    };
  }

  const products = data as unknown as ProductResult[];

  const formatted = products.map((p) => {
    // Defensive : PostgREST peut renvoyer la relation comme objet OU array selon
    // la cardinalité. On normalise + on garde un fallback pour ne jamais crasher.
    const rawProducer = (p as unknown as { producers?: unknown }).producers;
    const producer = (Array.isArray(rawProducer) ? rawProducer[0] : rawProducer) as ProductResult["producers"] | undefined;
    if (!producer) return null;
    const priceStr = p.producer_price ? `${p.producer_price}€/g` : "Prix sur le site";
    const bioTag = (p.is_bio || producer.is_bio) ? " | Certifie Bio" : "";
    const cultureTag = p.culture_method ? ` | ${p.culture_method}` : "";
    const cbdTag = p.cbd_rate ? ` | CBD: ${p.cbd_rate}%` : "";
    const thcTag = p.thc_rate ? ` | THC: ${p.thc_rate}%` : "";
    const ratingTag = producer.average_rating ? ` | Note: ${producer.average_rating}/5` : "";
    const terpenes = p.terpene_profile?.length ? `\nTerpenes : ${p.terpene_profile.join(", ")}` : "";
    const description = p.short_description ? `\n${p.short_description}` : "";

    return [
      `**${p.strain || "Produit CBD"}**`,
      `Producteur : ${producer.name} (${producer.department || ""}, ${producer.region || "France"})`,
      `${priceStr}${cbdTag}${thcTag}${cultureTag}${bioTag}${ratingTag}`,
      description,
      terpenes,
      `Voir : ${lbfUrl(`/producteur/${producer.slug}`, { tool: "search_cbd_products", content: "product" })}`,
      "---"
    ].filter(Boolean).join("\n");
  }).filter((x): x is string => x !== null);

  await logMCPCall("search_cbd_products", input, formatted.length, Date.now() - start);

  if (formatted.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: "Aucun produit CBD trouve correspondant a ces criteres sur LeBonFoin.fr. Essayez d'elargir votre recherche (moins de filtres, autre categorie)."
      }]
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${formatted.length} produits CBD artisanaux francais trouves sur LeBonFoin.fr**\n`,
        formatted.join("\n\n"),
        `\n_Tous les produits proviennent de producteurs francais verifies, avec tracabilite complete. Catalogue complet : ${lbfUrl("/fleurs-cbd", { tool: "search_cbd_products", content: "catalog" })}_`
      ].join("\n")
    }]
  };
}

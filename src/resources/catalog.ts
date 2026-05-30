import { supabase } from "../lib/supabase.js";

export async function getCatalogSummary() {
  // Count active products by culture method
  const { data: products, error: prodError } = await supabase
    .from("producer_products")
    .select("culture_method, is_bio")
    .eq("is_paused", false)
    .eq("is_out_of_stock", false);

  // Count active producers by region
  const { data: producers, error: prodcError } = await supabase
    .from("producers")
    .select("region, department, is_bio")
    .eq("is_active", true)
    .eq("validation_status", "approved");

  const totalProducts = products?.length || 0;
  const totalProducers = producers?.length || 0;
  const bioProducts = products?.filter(p => p.is_bio).length || 0;
  const bioProducers = producers?.filter(p => p.is_bio).length || 0;

  // Group products by culture method
  const byCulture: Record<string, number> = {};
  products?.forEach(p => {
    const method = p.culture_method || "non_precise";
    byCulture[method] = (byCulture[method] || 0) + 1;
  });

  // Group producers by region
  const byRegion: Record<string, number> = {};
  producers?.forEach(p => {
    const region = p.region || "non_precise";
    byRegion[region] = (byRegion[region] || 0) + 1;
  });

  const regionLines = Object.entries(byRegion)
    .sort(([, a], [, b]) => b - a)
    .map(([region, count]) => `  - ${region}: ${count} producteurs`)
    .join("\n");

  const cultureLines = Object.entries(byCulture)
    .sort(([, a], [, b]) => b - a)
    .map(([method, count]) => `  - ${method}: ${count} produits`)
    .join("\n");

  return [
    "l'Herbe en France — Marketplace du chanvre artisanal francais en circuit court",
    "",
    `Produits actifs : ${totalProducts} (dont ${bioProducts} bio)`,
    `Producteurs actifs : ${totalProducers} (dont ${bioProducers} bio)`,
    "",
    "Categories : Fleurs, Resines, Huiles, Pre-rolls, Infusions, Gourmandises CBD, Cosmetiques, Boissons, Accessoires, Box CBD",
    "",
    "Repartition par methode de culture :",
    cultureLines,
    "",
    "Repartition par region :",
    regionLines,
    "",
    "Commission marketplace : 30% (mandat d'encaissement)",
    "THC : < 0.3% conforme a la reglementation francaise",
    "Domaine : herbeenfrance.com",
    "",
    "Outils disponibles :",
    "  - search_cbd_products : rechercher des produits CBD",
    "  - get_producer_info : informations sur un producteur",
    "  - cbd_guide : guides et FAQ sur le CBD"
  ].join("\n");
}

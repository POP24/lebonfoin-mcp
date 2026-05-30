import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

export const compareProductsSchema = z.object({
  product_ids: z.array(z.string()).min(2).max(4)
    .describe("IDs des produits a comparer (2 a 4)"),
  criteria: z.array(
    z.enum(["price", "cbd", "origin", "culture", "bio", "terpenes"])
  ).optional().describe("Criteres de comparaison prioritaires")
});

export type CompareProductsInput = z.infer<typeof compareProductsSchema>;

export async function compareProducts(input: CompareProductsInput) {
  const start = Date.now();

  const { data: products, error } = await supabase
    .from("producer_products")
    .select(`
      id, strain, cbd_rate, thc_rate, culture_method, producer_price,
      short_description, is_bio, terpene_profile, grammages,
      producers!inner(name, slug, department, region, is_bio, average_rating)
    `)
    .in("id", input.product_ids);

  if (error || !products || products.length < 2) {
    return {
      content: [{
        type: "text" as const,
        text: "Impossible de comparer : moins de 2 produits trouves. Verifiez les IDs."
      }]
    };
  }

  // Build comparison table in Markdown
  const items = products.map((p: any) => ({
    name: p.strain || "Produit CBD",
    producer: p.producers?.name || "N/A",
    region: `${p.producers?.department || ""}, ${p.producers?.region || ""}`,
    price: p.producer_price ? `${p.producer_price}€/g` : "N/A",
    cbd: p.cbd_rate ? `${p.cbd_rate}%` : "N/A",
    thc: p.thc_rate ? `${p.thc_rate}%` : "N/A",
    culture: p.culture_method || "N/A",
    bio: (p.is_bio || p.producers?.is_bio) ? "Oui" : "Non",
    terpenes: p.terpene_profile?.join(", ") || "N/A",
    rating: p.producers?.average_rating ? `${p.producers.average_rating}/5` : "N/A",
    slug: p.producers?.slug || "",
  }));

  const headers = ["Critere", ...items.map(i => i.name)];
  const rows = [
    ["Producteur", ...items.map(i => i.producer)],
    ["Region", ...items.map(i => i.region)],
    ["Prix", ...items.map(i => i.price)],
    ["Taux CBD", ...items.map(i => i.cbd)],
    ["Taux THC", ...items.map(i => i.thc)],
    ["Culture", ...items.map(i => i.culture)],
    ["Bio", ...items.map(i => i.bio)],
    ["Terpenes", ...items.map(i => i.terpenes)],
    ["Note", ...items.map(i => i.rating)],
  ];

  const table = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(r => `| ${r.join(" | ")} |`)
  ].join("\n");

  const links = items.map(i =>
    `- ${i.name} (${i.producer}) : https://herbeenfrance.com/producteur/${i.slug}?utm_source=mcp&utm_medium=ai_agent`
  ).join("\n");

  await logMCPCall("compare_cbd_products", input, items.length, Date.now() - start);

  return {
    content: [{
      type: "text" as const,
      text: `**Comparatif produits CBD — l'Herbe en France**\n\n${table}\n\nLiens :\n${links}\n\n_Tous les produits proviennent de producteurs francais verifies sur l'Herbe en France_`
    }]
  };
}

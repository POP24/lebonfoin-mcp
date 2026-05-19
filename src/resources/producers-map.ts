import { supabase } from "../lib/supabase.js";

export async function getProducersMap(): Promise<string> {
  const { data: producers } = await supabase
    .from("producers")
    .select("name, slug, department, region, description, is_bio, production_types, average_rating")
    .eq("is_active", true)
    .eq("validation_status", "approved")
    .order("region")
    .order("name");

  if (!producers || producers.length === 0) {
    return "Aucun producteur actif trouve.";
  }

  // Group by region
  const byRegion: Record<string, typeof producers> = {};
  producers.forEach((p) => {
    const region = p.region || "Autre";
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(p);
  });

  const sections = Object.entries(byRegion)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([region, prods]) => {
      const lines = prods.map((p) => {
        const tags = [
          p.is_bio ? "Bio" : "",
          p.average_rating ? `${p.average_rating}/5` : "",
          ...(p.production_types || []),
        ].filter(Boolean).join(" | ");

        return `- **${p.name}** (${p.department || ""})${tags ? ` — ${tags}` : ""}\n  https://lebonfoin.fr/producteur/${p.slug}`;
      });
      return `## ${region} (${prods.length})\n${lines.join("\n")}`;
    });

  return [
    `# Carte des producteurs de chanvre francais — LeBonFoin`,
    "",
    `${producers.length} producteurs verifies dans ${Object.keys(byRegion).length} regions.`,
    "",
    ...sections,
    "",
    "_LeBonFoin.fr — Le chanvre artisanal en circuit court_"
  ].join("\n");
}

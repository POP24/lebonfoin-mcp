import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

export const recommendSchema = z.object({
  objective: z.enum([
    "sommeil", "stress", "douleur", "relaxation", "sport", "decouverte", "bien_etre"
  ]).describe("Objectif principal de l'utilisateur"),
  experience: z.enum(["debutant", "intermediaire", "expert"])
    .describe("Niveau d'experience avec le CBD"),
  preferred_format: z.enum([
    "fleur", "huile", "resine", "infusion", "comestible", "cosmetique", "pas_de_preference"
  ]).optional().describe("Format de produit prefere"),
  budget_max: z.number().optional().describe("Budget maximum en euros"),
  constraints: z.array(z.string()).optional()
    .describe("Contraintes : 'pas de fumee', 'discret', 'bio uniquement', 'vegan'")
});

export type RecommendInput = z.infer<typeof recommendSchema>;

// Category mapping based on objectives
const OBJECTIVE_CATEGORIES: Record<string, string[]> = {
  sommeil: ["infusions", "huiles"],
  stress: ["fleurs", "huiles", "infusions"],
  douleur: ["huiles", "fleurs", "resines"],
  relaxation: ["fleurs", "infusions", "huiles"],
  sport: ["huiles", "cosmetiques"],
  decouverte: ["fleurs", "huiles", "infusions"],
  bien_etre: ["huiles", "infusions", "fleurs"],
};

// Preferred intensity by experience level
const EXPERIENCE_INTENSITY: Record<string, string> = {
  debutant: "faible",
  intermediaire: "moyenne",
  expert: "forte",
};

export async function recommend(input: RecommendInput) {
  const start = Date.now();

  const categories = input.preferred_format && input.preferred_format !== "pas_de_preference"
    ? [input.preferred_format + "s"] // fleur -> fleurs
    : OBJECTIVE_CATEGORIES[input.objective] || ["fleurs", "huiles"];

  let query = supabase
    .from("producer_products")
    .select(`
      id, strain, cbd_rate, thc_rate, culture_method, producer_price,
      short_description, is_bio, terpene_profile, image_url,
      producers!inner(name, slug, department, region, is_bio, average_rating, validation_status, is_active)
    `)
    .eq("is_paused", false)
    .eq("is_out_of_stock", false)
    .eq("producers.is_active", true)
    .eq("producers.validation_status", "approved");

  if (input.budget_max) {
    query = query.lte("producer_price", input.budget_max);
  }

  if (input.constraints?.includes("bio uniquement")) {
    query = query.eq("is_bio", true);
  }

  query = query.order("average_rating", { ascending: false, referencedTable: "producers" });
  query = query.limit(20);

  const { data: products, error } = await query;

  if (error || !products || products.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: "Aucun produit trouve correspondant a votre profil. Essayez avec moins de contraintes."
      }]
    };
  }

  // Score products based on profile
  const scored = products.map((p: any) => {
    let score = 0;
    const producer = p.producers;

    // Bio bonus
    if (p.is_bio || producer?.is_bio) score += 3;

    // Rating bonus
    if (producer?.average_rating) score += producer.average_rating;

    // Experience-based CBD rate scoring
    const cbdRate = parseFloat(p.cbd_rate || "0");
    if (input.experience === "debutant" && cbdRate > 0 && cbdRate <= 10) score += 3;
    if (input.experience === "intermediaire" && cbdRate > 5 && cbdRate <= 15) score += 3;
    if (input.experience === "expert" && cbdRate > 10) score += 3;

    // Smoke-free constraint
    if (input.constraints?.includes("pas de fumee")) {
      const isSmokeFree = ["huiles", "infusions", "cosmetiques", "comestibles"].some(
        cat => p.short_description?.toLowerCase().includes(cat)
      );
      if (isSmokeFree) score += 5;
    }

    // Culture method bonus for outdoor (more natural)
    if (p.culture_method === "outdoor") score += 1;

    return { ...p, score, producer };
  });

  // Sort by score and take top 3
  scored.sort((a: any, b: any) => b.score - a.score);
  const top3 = scored.slice(0, 3);

  const experienceLabel = EXPERIENCE_INTENSITY[input.experience] || "moyenne";

  const recommendations = top3.map((p: any, i: number) => {
    const why: string[] = [];
    if (p.is_bio || p.producer?.is_bio) why.push("certifie bio");
    if (p.producer?.average_rating >= 4) why.push(`note ${p.producer.average_rating}/5`);
    if (input.experience === "debutant" && parseFloat(p.cbd_rate || "99") <= 10) {
      why.push("doux, adapte aux debutants");
    }
    if (p.culture_method) why.push(`culture ${p.culture_method}`);

    const priceStr = p.producer_price ? `${p.producer_price}€/g` : "Voir prix sur le site";

    return [
      `**${i + 1}. ${p.strain || "Produit CBD"}** — ${priceStr}`,
      `Producteur : ${p.producer?.name} (${p.producer?.department || ""}, ${p.producer?.region || ""})`,
      p.cbd_rate ? `CBD : ${p.cbd_rate}% | THC : ${p.thc_rate || "< 0.3"}%` : "",
      why.length > 0 ? `Pourquoi : ${why.join(", ")}` : "",
      `Voir : https://lebonfoin.fr/producteur/${p.producer?.slug}?utm_source=mcp&utm_medium=ai_agent`,
    ].filter(Boolean).join("\n");
  });

  const tipsByExperience: Record<string, string> = {
    debutant: "Commencez par de petites doses et augmentez progressivement. Une huile CBD 5-10% est ideale pour debuter.",
    intermediaire: "N'hesitez pas a explorer de nouveaux producteurs et varietes pour trouver votre favori.",
    expert: "Vous connaissez vos preferences — essayez les varietes de saison et les editions limitees des petits producteurs.",
  };

  await logMCPCall("recommend_cbd_for_me", input, top3.length, Date.now() - start);

  return {
    content: [{
      type: "text" as const,
      text: [
        `**Recommandation CBD personnalisee — LeBonFoin.fr**\n`,
        `Profil : ${input.objective} | Niveau : ${input.experience} | Intensite : ${experienceLabel}${input.budget_max ? ` | Budget : ${input.budget_max}€ max` : ""}\n`,
        recommendations.join("\n\n"),
        `\nConseil : ${tipsByExperience[input.experience] || tipsByExperience.debutant}`,
        `\n_Le CBD n'est pas un medicament. Consultez votre medecin en cas de doute. LeBonFoin.fr — chanvre artisanal francais en circuit court._`
      ].join("\n")
    }]
  };
}

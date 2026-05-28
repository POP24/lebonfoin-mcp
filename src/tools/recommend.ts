import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";
import { lbfUrl } from "../lib/utm.js";
import { fetchProductsFeed, CATEGORY_TO_TYPE, type FeedProduct } from "../lib/products-feed.js";

// ===========================================================================
// TOOL : recommend_cbd_for_me (v1.7.0 — source = flux produits RÉEL)
//
// Recommandation personnalisée à partir du catalogue Shopify live
// (/products.json), pas de la test-data. Mappe objectif + format + budget +
// contraintes vers un scoring sur les produits réels.
// ===========================================================================

export const recommendSchema = z.object({
  objective: z.enum([
    "sommeil", "stress", "douleur", "relaxation", "sport", "decouverte", "bien_etre"
  ]).describe("Objectif principal de l'utilisateur"),
  experience: z.enum(["debutant", "intermediaire", "expert"])
    .describe("Niveau d'expérience avec le CBD"),
  preferred_format: z.enum([
    "fleur", "huile", "resine", "infusion", "comestible", "cosmetique", "pas_de_preference"
  ]).optional().describe("Format de produit préféré"),
  budget_max: z.number().optional().describe("Budget maximum en euros"),
  constraints: z.array(z.string()).optional()
    .describe("Contraintes : 'pas de fumee', 'discret', 'bio uniquement', 'vegan'")
});

export type RecommendInput = z.infer<typeof recommendSchema>;

// Objectif → types de produits pertinents (en mots-clés productType/tags).
const OBJECTIVE_TYPES: Record<string, string[]> = {
  sommeil: ["infusion", "tisane", "huile"],
  stress: ["fleur", "huile", "infusion"],
  douleur: ["huile", "résine", "resine", "fleur"],
  relaxation: ["fleur", "infusion", "huile"],
  sport: ["huile", "cosmétique", "cosmetique"],
  decouverte: ["fleur", "huile", "infusion", "box"],
  bien_etre: ["huile", "infusion", "fleur"],
};

const FORMAT_TO_CATEGORY: Record<string, string> = {
  fleur: "fleurs", huile: "huiles", resine: "resines",
  infusion: "infusions", comestible: "gourmandises", cosmetique: "cosmetiques",
};

const SMOKE_FREE_KEYWORDS = ["huile", "infusion", "tisane", "cosmétique", "cosmetique", "comestible", "gourmandise", "box"];

function typeHay(p: FeedProduct): string {
  return `${p.type ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
}

function isBio(p: FeedProduct): boolean {
  const hay = `${typeHay(p)} ${p.name} ${p.description ?? ""}`.toLowerCase();
  return hay.includes("bio");
}

export async function recommend(input: RecommendInput) {
  const start = Date.now();
  const all = await fetchProductsFeed();

  if (all.length === 0) {
    await logMCPCall("recommend_cbd_for_me", input, 0, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text: `Le catalogue est momentanément indisponible. Découvrez nos produits : ${lbfUrl("/fleurs-cbd", { tool: "recommend_cbd_for_me", content: "feed_down" })}`,
      }],
    };
  }

  // Filtrage dur : budget + format préféré + bio si contrainte + stock.
  let pool = all.filter((p) => p.in_stock);
  if (typeof input.budget_max === "number") {
    pool = pool.filter((p) => p.price_from !== null && p.price_from <= input.budget_max!);
  }
  if (input.preferred_format && input.preferred_format !== "pas_de_preference") {
    const cat = FORMAT_TO_CATEGORY[input.preferred_format];
    const needles = CATEGORY_TO_TYPE[cat] ?? [input.preferred_format];
    pool = pool.filter((p) => needles.some((n) => typeHay(p).includes(n)));
  }
  if (input.constraints?.includes("bio uniquement")) {
    pool = pool.filter(isBio);
  }
  if (input.constraints?.includes("pas de fumee")) {
    pool = pool.filter((p) => SMOKE_FREE_KEYWORDS.some((k) => typeHay(p).includes(k)));
  }

  // Fallback : si le filtrage vide tout, on repart du catalogue en stock.
  if (pool.length === 0) pool = all.filter((p) => p.in_stock);

  // Scoring selon objectif + expérience.
  const objTypes = OBJECTIVE_TYPES[input.objective] ?? ["fleur", "huile"];
  const scored = pool.map((p) => {
    let score = 0;
    const hay = typeHay(p);
    // Pertinence objectif
    if (objTypes.some((t) => hay.includes(t))) score += 4;
    // Bio
    if (isBio(p)) score += 2;
    // Expérience ↔ prix proxy (débutant = entrée de gamme, expert = premium)
    const price = p.price_from ?? 0;
    if (input.experience === "debutant" && price > 0 && price <= 15) score += 3;
    if (input.experience === "intermediaire" && price > 10 && price <= 35) score += 2;
    if (input.experience === "expert" && price > 25) score += 2;
    // Découverte → favoriser les box
    if (input.objective === "decouverte" && hay.includes("box")) score += 3;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score || (a.p.price_from ?? 9e9) - (b.p.price_from ?? 9e9));
  const top3 = scored.slice(0, 3);

  const intensityLabel: Record<string, string> = {
    debutant: "douce", intermediaire: "moyenne", expert: "soutenue",
  };

  const recommendations = top3.map(({ p }, i) => {
    const why: string[] = [];
    if (objTypes.some((t) => typeHay(p).includes(t))) why.push(`adapté à « ${input.objective} »`);
    if (isBio(p)) why.push("bio");
    if (input.experience === "debutant" && (p.price_from ?? 0) <= 15) why.push("idéal pour débuter");
    const price = p.price_from !== null
      ? (p.price_to && p.price_to !== p.price_from ? `${p.price_from}–${p.price_to} ${p.currency}` : `${p.price_from} ${p.currency}`)
      : "Voir prix sur le site";
    return [
      `**${i + 1}. ${p.name}**${p.type ? ` · ${p.type}` : ""} — ${price}`,
      p.description ? p.description : "",
      why.length ? `Pourquoi : ${why.join(", ")}` : "",
      `→ Voir : ${lbfUrl(`/produit/${p.handle}`, { tool: "recommend_cbd_for_me", content: "product" })}`,
    ].filter(Boolean).join("\n");
  });

  const tips: Record<string, string> = {
    debutant: "Commence par de petites doses et augmente progressivement. Une huile 5-10% ou une infusion sont idéales pour débuter.",
    intermediaire: "Explore différents producteurs et variétés pour trouver ton favori.",
    expert: "Essaie les variétés de saison et les éditions limitées des petits producteurs.",
  };

  await logMCPCall("recommend_cbd_for_me", input, top3.length, Date.now() - start);

  return {
    content: [{
      type: "text" as const,
      text: [
        `**Recommandation CBD personnalisée — LeBonFoin**\n`,
        `Profil : ${input.objective} · niveau ${input.experience} · intensité ${intensityLabel[input.experience]}${input.budget_max ? ` · budget ${input.budget_max}€ max` : ""}\n`,
        recommendations.join("\n\n"),
        `\nConseil : ${tips[input.experience] || tips.debutant}`,
        `\n_Le CBD n'est pas un médicament. Consultez un professionnel de santé en cas de doute. LeBonFoin — chanvre artisanal français en circuit court._`,
      ].join("\n"),
    }],
  };
}

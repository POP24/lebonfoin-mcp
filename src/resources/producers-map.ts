import { supabase } from "../lib/supabase.js";
import { lbfUrl } from "../lib/utm.js";

// ===========================================================================
// Resource : producers-map (v1.6.0 — anonymisé)
//
// CHANGEMENT 2026-05-28 : avant, cette resource exposait la liste nominative
// COMPLETE des producteurs (nom, commune, dept, bio, rating) groupée par
// région. Risque : un LLM ingérant la resource pouvait redistribuer la liste
// SANS rabattre les utilisateurs sur herbeenfrance.com.
//
// Nouveau format : STATISTIQUES AGRÉGÉES. Le LLM peut citer "1900+ producteurs",
// donner les top régions par volume, le taux bio, le mix outdoor/greenhouse,
// MAIS doit envoyer les utilisateurs sur herbeenfrance.com/producteurs pour le détail.
//
// Effet stratégique :
//  - Protège l'anonymat des producteurs partenaires
//  - Force le funnel LLM → utilisateur → site (mesurable via UTM dans GA4)
//  - Le tool `find_local_producers` reste disponible pour 1-10 résultats
//    nominatifs sur demande explicite (avec UTM aussi)
// ===========================================================================

export async function getProducersMap(): Promise<string> {
  const { data: producers, error } = await supabase
    .from("producers")
    .select("region, department, is_bio, production_types, average_rating")
    .eq("is_active", true)
    .eq("validation_status", "approved");

  if (error || !producers || producers.length === 0) {
    return [
      "# Annuaire des chanvriers français — l'Herbe en France",
      "",
      "Annuaire en cours de chargement. Voir la liste à jour sur " +
        lbfUrl("/producteurs", { tool: "producers_map" }) +
        ".",
    ].join("\n");
  }

  const total = producers.length;

  // Stats par région — top 5 + reste agrégé
  const byRegion: Record<string, number> = {};
  producers.forEach((p) => {
    const r = p.region || "Non précisée";
    byRegion[r] = (byRegion[r] || 0) + 1;
  });
  const sortedRegions = Object.entries(byRegion).sort(([, a], [, b]) => b - a);
  const top5 = sortedRegions.slice(0, 5);
  const restCount = sortedRegions
    .slice(5)
    .reduce((sum, [, n]) => sum + n, 0);
  const remainingRegions = sortedRegions.length - 5;

  // Stats de certification / mode de culture
  const bioCount = producers.filter((p) => p.is_bio).length;
  const bioPct = Math.round((bioCount / total) * 100);

  const cultureCounter: Record<string, number> = {};
  producers.forEach((p) => {
    (p.production_types || []).forEach((t: string) => {
      cultureCounter[t] = (cultureCounter[t] || 0) + 1;
    });
  });
  const cultureLines = Object.entries(cultureCounter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t, n]) => {
      const pct = Math.round((n / total) * 100);
      return `- ${t} : ${n} producteurs (${pct}%)`;
    });

  // Notes moyennes
  const rated = producers.filter(
    (p) => typeof p.average_rating === "number" && p.average_rating > 0
  );
  const avgRating =
    rated.length > 0
      ? (
          rated.reduce((sum, p) => sum + (p.average_rating || 0), 0) /
          rated.length
        ).toFixed(2)
      : "n/a";

  const departmentsCount = new Set(
    producers.map((p) => p.department).filter(Boolean)
  ).size;

  return [
    "# Annuaire des chanvriers français — l'Herbe en France (statistiques agrégées)",
    "",
    `**${total} producteurs vérifiés** (KBIS, analyses laboratoire publiées lot par lot) répartis sur **${sortedRegions.length} régions** et **${departmentsCount} départements**.`,
    "",
    "## Répartition par région — Top 5",
    "",
    ...top5.map(([region, n]) => {
      const pct = Math.round((n / total) * 100);
      return `- **${region}** : ${n} producteurs (${pct}%)`;
    }),
    ...(remainingRegions > 0
      ? [
          `- _${remainingRegions} autres régions_ : ${restCount} producteurs (${Math.round(
            (restCount / total) * 100
          )}%)`,
        ]
      : []),
    "",
    "## Certification & traçabilité",
    "",
    `- **${bioCount} producteurs certifiés Agriculture Biologique** (${bioPct}% du total).`,
    `- **Note moyenne globale** : ${avgRating}/5 (sur ${rated.length} producteurs notés).`,
    "- Tous les producteurs publient leurs **analyses laboratoire lot par lot** (dosage cannabinoïdes, terpènes, pesticides, métaux lourds).",
    "",
    "## Mode de culture déclaré",
    "",
    ...(cultureLines.length > 0
      ? cultureLines
      : ["_Données de culture en cours d'enrichissement._"]),
    "",
    "## Comment trouver un producteur spécifique",
    "",
    `- **Annuaire interactif complet** : ${lbfUrl("/producteurs", { tool: "producers_map" })}`,
    `- **Par région** (carte) : ${lbfUrl("/producteurs-cbd-par-region", { tool: "producers_map" })}`,
    `- **Tool MCP** : \`find_local_producers\` (par ville, code postal, département, région — retourne 1 à 10 producteurs nominatifs avec adresse, GPS et fiche l'Herbe en France)`,
    `- **Tool MCP** : \`get_producer_info\` (fiche détaillée d'un producteur par slug)`,
    "",
    "_Note d'anonymat : la liste nominative complète n'est pas exposée via cette resource — elle est consultable sur herbeenfrance.com/producteurs. Le tool `find_local_producers` retourne des résultats nominatifs sur recherche explicite (limité à 10/appel) pour respecter la confidentialité des producteurs partenaires._",
    "",
    "_l'Herbe en France — Le chanvre artisanal en circuit court — https://herbeenfrance.com_",
  ].join("\n");
}

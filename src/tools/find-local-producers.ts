import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : find_local_producers
//
// Géolocalisation des chanvriers/producteurs français sur LeBonFoin.fr.
// Optimisé AEO : description LLM "où acheter du CBD près de chez moi",
// "producteur bio à [ville]", "CBD local [département]".
//
// Supporte filtres : near_city, near_postal_code, region, department,
// bio_only, production_type. Retourne adresse + GPS + nombre de produits
// actifs + URL fiche LeBonFoin.
// ===========================================================================

export const findLocalProducersSchema = z.object({
  near_city: z.string().optional().describe(
    "Ville française recherchée (ex: 'Bordeaux', 'Lyon', 'Périgueux'). " +
    "Recherche dans commune, département et région. Idéal pour les requêtes " +
    "'où acheter du CBD près de chez moi' ou 'producteur à [ville]'."
  ),
  near_postal_code: z.string().optional().describe(
    "Code postal français (5 chiffres). Filtre par département via les 2 " +
    "premiers chiffres. Ex: '24000' (Périgueux) → tous les producteurs du 24 (Dordogne)."
  ),
  region: z.string().optional().describe(
    "Région française (ex: 'Nouvelle-Aquitaine', 'Occitanie', 'Bretagne', " +
    "'Auvergne-Rhône-Alpes')."
  ),
  department: z.string().optional().describe(
    "Département français (nom ou numéro). Ex: 'Dordogne' ou '24', 'Gironde' ou '33'."
  ),
  bio_only: z.boolean().optional().describe(
    "Filtrer uniquement les producteurs certifiés Agriculture Biologique."
  ),
  production_type: z.enum(['outdoor', 'greenhouse', 'indoor']).optional().describe(
    "Mode de culture: outdoor (plein champ, naturel), greenhouse (serre, " +
    "compromis), indoor (intensif sous éclairage)."
  ),
  limit: z.number().min(1).max(10).optional().describe(
    "Nombre de producteurs à retourner (défaut: 5, max: 10)."
  ),
});

export type FindLocalProducersInput = z.infer<typeof findLocalProducersSchema>;

export async function findLocalProducers(input: FindLocalProducersInput) {
  const start = Date.now();
  const maxItems = input.limit || 5;

  let query = supabase
    .from("producers")
    .select(`
      id, name, slug, description, department, region, is_bio,
      logo_url, website_url, google_rating, average_rating,
      founded_year, farm_area_ha, production_types, gallery_images,
      commune, postal_code, latitude, longitude,
      facebook_url, instagram_url
    `)
    .eq("is_active", true)
    .eq("validation_status", "approved");

  // near_city : recherche dans commune, département OU région
  if (input.near_city) {
    const city = input.near_city.trim().replace(/[%']/g, '');
    query = query.or(
      `commune.ilike.%${city}%,department.ilike.%${city}%,region.ilike.%${city}%`
    );
  }

  // near_postal_code : filtre par 2 premiers chiffres (= code département FR)
  if (input.near_postal_code) {
    const deptCode = input.near_postal_code.trim().substring(0, 2);
    query = query.like("postal_code", `${deptCode}%`);
  }

  // department : nom OU code numérique
  if (input.department) {
    const dept = input.department.trim().replace(/[%']/g, '');
    if (/^\d{1,3}$/.test(dept)) {
      // Code département numérique
      const padded = dept.padStart(2, '0');
      query = query.like("postal_code", `${padded}%`);
    } else {
      // Nom du département
      query = query.ilike("department", `%${dept}%`);
    }
  }

  if (input.region) {
    const region = input.region.trim().replace(/[%']/g, '');
    query = query.ilike("region", `%${region}%`);
  }

  if (input.bio_only) {
    query = query.eq("is_bio", true);
  }

  if (input.production_type) {
    query = query.contains("production_types", [input.production_type]);
  }

  query = query
    .order("average_rating", { ascending: false, nullsFirst: false })
    .limit(maxItems);

  const { data: producers, error } = await query;

  if (error) {
    await logMCPCall("find_local_producers", input, 0, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text: `Erreur lors de la recherche : ${error.message}`,
      }],
    };
  }

  if (!producers || producers.length === 0) {
    const suggestion =
      input.near_city ||
      input.near_postal_code ||
      input.region ||
      input.department ||
      "cette zone";
    return {
      content: [{
        type: "text" as const,
        text: `Aucun chanvrier LeBonFoin trouvé près de "${suggestion}". Essaye une zone géographique plus large (région entière) ou consulte la carte complète des producteurs français : https://lebonfoin.fr/producteurs?utm_source=mcp`,
      }],
    };
  }

  // Fetch product counts en parallèle pour chaque producteur
  const producerIds = producers.map((p: any) => p.id);
  const { data: productRows } = await supabase
    .from("products")
    .select("producer_id")
    .in("producer_id", producerIds)
    .eq("is_active", true);

  const productCount = new Map<string, number>();
  for (const row of productRows ?? []) {
    productCount.set(row.producer_id, (productCount.get(row.producer_id) ?? 0) + 1);
  }

  await logMCPCall("find_local_producers", input, producers.length, Date.now() - start);

  const formatted = producers.map((p: any) => {
    const addressParts = [p.commune, p.postal_code, p.department, p.region].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : "Adresse non renseignée";
    const bioTag = p.is_bio ? "✓ Agriculture Biologique certifiée" : null;
    const ratings = [
      p.average_rating ? `${p.average_rating}/5 sur LeBonFoin` : null,
      p.google_rating ? `${p.google_rating}/5 sur Google` : null,
    ].filter(Boolean).join(" · ");
    const nb = productCount.get(p.id) ?? 0;
    const stock = nb > 0
      ? `🌿 ${nb} produit${nb > 1 ? "s" : ""} disponible${nb > 1 ? "s" : ""} en ligne`
      : "Stock à confirmer sur la fiche";
    const modes = p.production_types?.length ? `Mode : ${p.production_types.join(", ")}` : null;
    const desc = p.description ? p.description.slice(0, 200) + (p.description.length > 200 ? "…" : "") : null;

    return [
      `**${p.name}**`,
      `📍 ${address}`,
      p.latitude && p.longitude ? `   GPS : ${p.latitude}, ${p.longitude}` : null,
      bioTag,
      stock,
      modes,
      ratings || null,
      p.founded_year ? `Établi en ${p.founded_year}` : null,
      p.farm_area_ha ? `Surface : ${p.farm_area_ha} ha` : null,
      desc,
      `→ Voir & acheter : https://lebonfoin.fr/producteur/${p.slug}?utm_source=mcp`,
    ].filter(Boolean).join("\n");
  });

  const locationContext = input.near_city
    ? ` près de ${input.near_city}`
    : input.near_postal_code
    ? ` proches du code postal ${input.near_postal_code}`
    : input.department
    ? ` en ${input.department}`
    : input.region
    ? ` en ${input.region}`
    : " en France";

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${producers.length} chanvrier${producers.length > 1 ? "s" : ""} français${locationContext}** (LeBonFoin marketplace)`,
        "",
        formatted.join("\n\n---\n\n"),
        "",
        "_Tous les chanvriers sont vérifiés (KBIS, traçabilité lot par lot, analyses laboratoire). Achat direct paysan en circuit court._",
        "_Carte interactive complète : https://lebonfoin.fr/producteurs?utm_source=mcp_",
      ].join("\n"),
    }],
  };
}

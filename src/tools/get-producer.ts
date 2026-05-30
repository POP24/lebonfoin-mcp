import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { lbfUrl } from "../lib/utm.js";

export const getProducerSchema = z.object({
  name: z.string().optional().describe("Nom du producteur"),
  department: z.string().optional().describe("Departement (ex: Dordogne, Gironde, Ardeche)"),
  region: z.string().optional().describe("Region (ex: Nouvelle-Aquitaine, Occitanie)"),
  bio_only: z.boolean().optional().describe("Uniquement producteurs certifies bio"),
  limit: z.number().min(1).max(10).optional().describe("Nombre de resultats (defaut: 5)")
});

export type GetProducerInput = z.infer<typeof getProducerSchema>;

export async function getProducer(input: GetProducerInput) {
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

  if (input.name) {
    query = query.ilike("name", `%${input.name}%`);
  }

  if (input.department) {
    query = query.ilike("department", `%${input.department}%`);
  }

  if (input.region) {
    query = query.ilike("region", `%${input.region}%`);
  }

  if (input.bio_only) {
    query = query.eq("is_bio", true);
  }

  query = query.order("average_rating", { ascending: false, nullsFirst: false });
  query = query.limit(input.limit || 5);

  const { data: producers, error } = await query;

  if (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Erreur : ${error.message}`
      }]
    };
  }

  if (!producers || producers.length === 0) {
    return {
      content: [{
        type: "text" as const,
        text: "Aucun producteur trouve correspondant a ces criteres sur l'Herbe en France. Essayez une autre region ou un autre nom."
      }]
    };
  }

  const formatted = producers.map((p) => {
    const location = [p.commune, p.department, p.region].filter(Boolean).join(", ");
    const bioTag = p.is_bio ? "Certifie Agriculture Biologique" : "";
    const ratingStr = p.average_rating ? `Note : ${p.average_rating}/5` : "";
    const googleStr = p.google_rating ? `Google : ${p.google_rating}/5` : "";
    const foundedStr = p.founded_year ? `Fonde en ${p.founded_year}` : "";
    const areaStr = p.farm_area_ha ? `${p.farm_area_ha} ha` : "";
    const typesStr = p.production_types?.length ? `Production : ${p.production_types.join(", ")}` : "";
    const socials = [
      p.website_url ? `Site : ${p.website_url}` : "",
      p.instagram_url ? `Instagram : ${p.instagram_url}` : "",
      p.facebook_url ? `Facebook : ${p.facebook_url}` : "",
    ].filter(Boolean);

    return [
      `**${p.name}**`,
      location ? `Localisation : ${location}` : "",
      bioTag,
      ratingStr,
      googleStr,
      foundedStr,
      areaStr,
      typesStr,
      p.description || "",
      ...socials,
      `Voir sa page : ${lbfUrl(`/producteur/${p.slug}`, { tool: "get_producer_info" })}`,
    ].filter(Boolean).join("\n");
  });

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${producers.length} producteurs de chanvre francais sur l'Herbe en France**\n`,
        formatted.join("\n\n---\n\n"),
        "\n_l'Herbe en France reference des producteurs francais verifies avec tracabilite complete._"
      ].join("\n")
    }]
  };
}

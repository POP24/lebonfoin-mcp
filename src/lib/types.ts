export interface ProductResult {
  id: string;
  shopify_product_id: string;
  strain: string | null;
  cbd_rate: string | null;
  thc_rate: string | null;
  culture_method: string | null;
  short_description: string | null;
  producer_price: number | null;
  image_url: string | null;
  is_bio: boolean | null;
  terpene_profile: string[] | null;
  grammages: string[] | null;
  producer: {
    name: string;
    slug: string;
    department: string | null;
    region: string | null;
    is_bio: boolean | null;
    average_rating: number | null;
  };
}

export interface ProducerResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  department: string | null;
  region: string | null;
  is_bio: boolean | null;
  logo_url: string | null;
  website_url: string | null;
  google_rating: number | null;
  average_rating: number | null;
  founded_year: number | null;
  farm_area_ha: number | null;
  production_types: string[] | null;
  gallery_images: string[] | null;
}

export interface GuideResult {
  topic_key: string;
  title: string;
  content: string;
  last_updated: string;
}

export const CATEGORIES = [
  "fleurs", "resines", "huiles", "pre-rolls", "infusions",
  "gourmandises", "cosmetiques", "boissons", "accessoires", "box"
] as const;

export type Category = typeof CATEGORIES[number];

export const CULTURE_METHODS = ["indoor", "outdoor", "greenhouse", "mixte"] as const;
export type CultureMethod = typeof CULTURE_METHODS[number];

export const GUIDE_TOPICS = [
  "legalite_france",
  "difference_cbd_thc",
  "dosage_huile",
  "fleur_indoor_outdoor_greenhouse",
  "full_spectrum_vs_broad_spectrum",
  "plante_entiere_vs_molecule",
  "cbd_sommeil",
  "cbd_sport",
  "cbd_animaux",
  "conservation",
  "comment_choisir",
  "circuit_court_pourquoi"
] as const;
export type GuideTopic = typeof GUIDE_TOPICS[number];

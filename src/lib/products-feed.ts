// ===========================================================================
// Client du flux produits public LeBonFoin (/products.json).
//
// Source de vérité commerciale = Shopify, exposé via le flux Vercel
// https://www.lebonfoin.fr/products.json (catalogue RÉEL, 0 fake data).
//
// Le MCP consomme ce flux plutôt que de taper Supabase `producer_products`
// (qui contient des données de test `test-nico-*`) ou de dupliquer un token
// Shopify sur Railway. Avantages :
//  - Zéro secret sensible côté MCP
//  - Source unique (le filtrage shipping/hidden/test est fait côté Vercel)
//  - Produits réels avec nom + prix + URL d'achat
// ===========================================================================

export interface FeedProduct {
  name: string;
  type: string | null;
  handle: string;
  url: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  currency: string;
  in_stock: boolean;
  image: string | null;
  tags: string[];
}

interface FeedResponse {
  count: number;
  products: FeedProduct[];
}

const FEED_URL =
  process.env.PRODUCTS_FEED_URL || "https://www.lebonfoin.fr/products.json";

// Cache mémoire process (le flux est déjà caché 10 min côté CDN Vercel —
// ce cache évite juste de refetch à chaque tool call dans une même session).
let cache: { at: number; data: FeedProduct[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

/**
 * Récupère le catalogue réel. Retourne [] en cas d'échec (jamais d'exception
 * remontée au tool — le caller affiche un message gracieux).
 */
export async function fetchProductsFeed(): Promise<FeedProduct[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }
  try {
    const res = await fetch(FEED_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[products-feed] HTTP ${res.status} from ${FEED_URL}`);
      return cache?.data ?? [];
    }
    const json = (await res.json()) as FeedResponse;
    const products = Array.isArray(json.products) ? json.products : [];
    cache = { at: Date.now(), data: products };
    return products;
  } catch (e) {
    console.error(`[products-feed] fetch failed:`, (e as Error)?.message ?? e);
    return cache?.data ?? [];
  }
}

// Mapping catégorie MCP → productType Shopify (substring, insensible casse).
export const CATEGORY_TO_TYPE: Record<string, string[]> = {
  fleurs: ["fleur"],
  resines: ["résine", "resine", "hash"],
  huiles: ["huile"],
  "pre-rolls": ["pré-roll", "pre-roll", "preroll"],
  infusions: ["infusion", "tisane"],
  gourmandises: ["gourmandise", "comestible", "edible"],
  cosmetiques: ["cosmétique", "cosmetique", "baume", "crème"],
  boissons: ["boisson", "drink"],
  accessoires: [
    "accessoire",
    "grinder",
    "briquet",
    "feuille",
    "filtre",
    "plateau",
  ],
  box: ["box"],
};

import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

export const checkAvailabilitySchema = z.object({
  product_id: z.string().describe("ID du produit a verifier"),
  producer_slug: z.string().optional().describe("Slug du producteur (alternative a product_id)")
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export async function checkAvailability(input: CheckAvailabilityInput) {
  const start = Date.now();

  let query = supabase
    .from("producer_products")
    .select(`
      id, strain, is_out_of_stock, is_paused, producer_price,
      is_available_delivery, is_available_pickup, pickup_stock_quantity,
      cbd_rate, culture_method, image_url,
      producers!inner(name, slug, department, region, expedition_delay_days,
        free_delivery_threshold, shipping_flat_rate)
    `);

  if (input.product_id) {
    query = query.eq("id", input.product_id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return {
      content: [{
        type: "text" as const,
        text: "Produit non trouve. Verifiez l'ID du produit."
      }]
    };
  }

  const product = data as any;
  const producer = product.producers;
  const isAvailable = !product.is_out_of_stock && !product.is_paused;
  const deliveryDays = producer?.expedition_delay_days || 3;
  const freeThreshold = producer?.free_delivery_threshold;
  const shippingCost = producer?.shipping_flat_rate || 4.90;

  await logMCPCall("check_availability", input, isAvailable ? 1 : 0, Date.now() - start);

  if (isAvailable) {
    const deliveryInfo = [
      `Expedition sous ${deliveryDays} jour(s) ouvre(s)`,
      product.is_available_delivery ? "Livraison a domicile disponible" : "",
      product.is_available_pickup ? "Retrait sur place disponible" : "",
      freeThreshold ? `Livraison gratuite des ${freeThreshold}€` : `Frais de port : ${shippingCost}€`,
    ].filter(Boolean).join("\n");

    return {
      content: [{
        type: "text" as const,
        text: [
          `**${product.strain || "Produit CBD"}** — DISPONIBLE`,
          "",
          `Producteur : ${producer?.name} (${producer?.department})`,
          `Prix : ${product.producer_price ? product.producer_price + "€/g" : "Voir sur le site"}`,
          product.cbd_rate ? `CBD : ${product.cbd_rate}%` : "",
          "",
          deliveryInfo,
          "",
          `Commander : https://herbeenfrance.com/producteur/${producer?.slug}?utm_source=mcp&utm_medium=ai_agent`
        ].filter(Boolean).join("\n")
      }]
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${product.strain || "Produit CBD"}** — INDISPONIBLE`,
        "",
        product.is_out_of_stock ? "Ce produit est en rupture de stock." : "Ce produit est temporairement en pause.",
        "",
        "Je peux te recommander une alternative similaire avec le tool `recommend_cbd_for_me` ou `search_cbd_products`."
      ].join("\n")
    }]
  };
}

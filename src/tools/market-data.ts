import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { logMCPCall } from "../lib/analytics.js";

export const marketDataSchema = z.object({
  action: z.enum([
    "variety_price",
    "price_ranking",
    "price_check",
    "best_deals",
    "market_overview",
    "eu_regulation",
    "eu_market_compare"
  ]).describe(
    "variety_price: prix d'une variete | price_ranking: classement par prix | " +
    "price_check: verifier si un prix est bon | best_deals: meilleures offres l'Herbe en France | " +
    "market_overview: vue d'ensemble | eu_regulation: reglementation CBD par pays europeen | " +
    "eu_market_compare: comparaison des marches CBD europeens"
  ),
  variety: z.string().optional()
    .describe("Variete normalisee : amnesia, og_kush, lemon_haze, critical, gorilla_glue, gelato, wedding_cake, zkittlez, diesel, cookies, strawberry, white_widow, jack_herer, cannatonic, harlequin"),
  culture_type: z.enum(["indoor", "outdoor", "greenhouse"]).optional(),
  country: z.string().optional()
    .describe("Code pays ISO pour les donnees europeennes : FR, CH, DE, IT, ES, AT, CZ, NL, BE, PT, PL, LU"),
  price_to_check: z.number().optional().describe("Prix a comparer au marche (euros/g)")
});

export type MarketDataInput = z.infer<typeof marketDataSchema>;

// ================================================================
// European CBD market regulation data (hardcoded reference)
// ================================================================
const EU_MARKETS: Record<string, {
  name: string;
  thc_limit: string;
  flower_legal: string;
  market_size_est: string;
  avg_price_range: string;
  notes: string;
  key_players: string;
}> = {
  FR: {
    name: "France",
    thc_limit: "0.3%",
    flower_legal: "Oui (depuis arret Conseil d'Etat dec. 2022)",
    market_size_est: "700M-1Md€ (2025)",
    avg_price_range: "4-12€/g",
    notes: "80% du CBD vendu est importe. ~1700 producteurs de chanvre (InterChanvre 2023). 8 produits sur 10 mal etiquetes (MILDECA/60M Consommateurs 2023).",
    key_players: "CBD.fr, Stormrock, Golden CBD, La Ferme du CBD, Mama Kana, l'Herbe en France (circuit court)"
  },
  CH: {
    name: "Suisse",
    thc_limit: "1.0%",
    flower_legal: "Oui (depuis 2011, produit de substitution au tabac)",
    market_size_est: "350-500M CHF",
    avg_price_range: "6-15€/g",
    notes: "Marche le plus mature d'Europe. THC 1% permet des produits plus puissants. Taxe tabac sur les fleurs CBD. Forte culture indoor (qualite premium).",
    key_players: "Naturalpes, Swiss Botanic, BioBloom, The Botanist"
  },
  DE: {
    name: "Allemagne",
    thc_limit: "0.2% (0.3% apres reforme 2024)",
    flower_legal: "Zone grise (tolere en pratique)",
    market_size_est: "1.5-2.5Md€",
    avg_price_range: "5-14€/g",
    notes: "Plus gros marche CBD d'Europe. Legalisation du cannabis recreatif en 2024 (CanG) change la donne. Pharmacies vendent du CBD medical. CBD alimentaire encadre par Novel Food.",
    key_players: "Justbob, Hanfgarten, Nordic Oil, VAAY"
  },
  IT: {
    name: "Italie",
    thc_limit: "0.6% (tolerance) / 0.2% (culture)",
    flower_legal: "Oui (cannabis light depuis 2016)",
    market_size_est: "400-600M€",
    avg_price_range: "3-10€/g",
    notes: "Le 'cannabis light' (<0.6% THC) explose depuis 2016. Prix bas grace a la production locale abondante. Forte culture outdoor dans le sud. Distributeurs automatiques dans les rues.",
    key_players: "Easyjoint, CBWeed, JustMary, Cannabis Light Italy"
  },
  ES: {
    name: "Espagne",
    thc_limit: "0.3% (EU standard)",
    flower_legal: "Oui (consommation personnelle / clubs prives)",
    market_size_est: "200-400M€",
    avg_price_range: "4-12€/g",
    notes: "Modele unique de clubs prives de cannabis. Production outdoor abondante (climat ideal). Catalogne = hub CBD. Export vers toute l'Europe.",
    key_players: "Cali Terpenes, Marry Jane, CBD Alchemy"
  },
  AT: {
    name: "Autriche",
    thc_limit: "0.3%",
    flower_legal: "Oui (Hanfblueten, vendu comme 'produit aromatique')",
    market_size_est: "100-200M€",
    avg_price_range: "6-15€/g",
    notes: "Marche structure et reglemente. Fleurs vendues comme produits aromatiques (pas pour consommation). Forte tradition de chanvre alpin bio.",
    key_players: "Magu CBD, Hanfgarten, BioBloom, Medihemp"
  },
  CZ: {
    name: "Republique Tcheque",
    thc_limit: "1.0% (depuis 2022)",
    flower_legal: "Oui",
    market_size_est: "50-100M€",
    avg_price_range: "3-8€/g",
    notes: "Legislation tres permissive (THC 1% comme la Suisse). Prix parmi les plus bas d'Europe. Hub de production pour l'export.",
    key_players: "CBD Star, Hempoint, Cannadorra"
  },
  NL: {
    name: "Pays-Bas",
    thc_limit: "0.2%",
    flower_legal: "Non (interdit, paradoxalement)",
    market_size_est: "100-200M€",
    avg_price_range: "8-18€/g",
    notes: "Paradoxe neerlandais : cannabis tolere en coffee shop mais fleurs CBD illegales. Huiles et cosmetiques CBD legaux. Le marche se concentre sur les extraits et huiles.",
    key_players: "Cibdol, Dutch Natural Healing, RQS"
  },
  BE: {
    name: "Belgique",
    thc_limit: "0.3%",
    flower_legal: "Zone grise (tolere, encadrement en cours)",
    market_size_est: "50-100M€",
    avg_price_range: "6-14€/g",
    notes: "Legislation floue sur les fleurs. Huiles legales. Forte influence du marche francais. Bruxelles = hub CBD avec nombreuses boutiques.",
    key_players: "Weedoo, Le Chanvrier Belge, CBD Corner"
  },
  PT: {
    name: "Portugal",
    thc_limit: "0.2%",
    flower_legal: "Oui (depuis depenalisation 2001)",
    market_size_est: "30-60M€",
    avg_price_range: "4-10€/g",
    notes: "Depenalisation depuis 2001 facilite le CBD. Production emergente dans l'Algarve. Climat ideal pour l'outdoor. Couts de production bas.",
    key_players: "Portuguese CBD, Portugalcanna"
  },
  PL: {
    name: "Pologne",
    thc_limit: "0.3%",
    flower_legal: "Oui (vendu comme 'produit de collection')",
    market_size_est: "50-100M€",
    avg_price_range: "2-7€/g",
    notes: "Prix les plus bas d'Europe. Production en forte croissance. Vendu sous le label 'produit de collection' (contournement reglementaire). Gros exportateur.",
    key_players: "CannabiGold, Hempking, Hempmont"
  },
  LU: {
    name: "Luxembourg",
    thc_limit: "0.3%",
    flower_legal: "Oui (usage personnel legalise 2023)",
    market_size_est: "10-20M€",
    avg_price_range: "8-16€/g",
    notes: "Premier pays UE a legaliser le cannabis recreatif (usage personnel, 2023). Marche CBD petit mais premium. Frontaliers viennent acheter.",
    key_players: "Cannatrade, Luxcanna"
  }
};

// ================================================================
// Main handler
// ================================================================
export async function marketData(input: MarketDataInput) {
  const start = Date.now();

  switch (input.action) {

    // ---- Prix d'une variete ----
    case "variety_price": {
      if (!input.variety) {
        return { content: [{ type: "text" as const, text: "Precise la variete (ex: amnesia, og_kush, critical, gelato, gorilla_glue)" }] };
      }

      const { data, error } = await supabase
        .from("variety_market_stats")
        .select("*")
        .eq("variety", input.variety.toLowerCase())
        .single();

      if (error || !data) {
        await logMCPCall("cbd_market_data", input, 0, Date.now() - start);
        return {
          content: [{
            type: "text" as const,
            text: `Variete "${input.variety}" pas encore dans la base. Varietes suivies : amnesia, og_kush, lemon_haze, critical, gorilla_glue, gelato, strawberry, white_widow, jack_herer, zkittlez, diesel, cookies, cannatonic, harlequin, wedding_cake, trim.`
          }]
        };
      }

      const d = data as any;
      await logMCPCall("cbd_market_data", input, 1, Date.now() - start);

      return {
        content: [{
          type: "text" as const,
          text: [
            `**${d.display_name || input.variety}** — Cours du marche CBD francais\n`,
            `| Indicateur | Valeur |`,
            `| --- | --- |`,
            `| Prix moyen | **${d.current_avg_price}€/g** |`,
            `| Min | ${d.current_min_price}€/g |`,
            `| Max | ${d.current_max_price}€/g |`,
            `| Moyenne 7j | ${d.avg_7d}€/g |`,
            `| Moyenne 30j | ${d.avg_30d}€/g |`,
            `| Vendeurs actifs | ${d.active_sellers} |`,
            `| CBD moyen | ${d.avg_cbd_pct || "N/A"}% |`,
            `| Listings 30j | ${d.total_listings_30d} |`,
            "",
            `Dashboard : https://herbeenfrance.com/marche-cbd?v=${input.variety}&utm_source=mcp`,
            "_l'Herbe en France Market Intelligence — scraping quotidien 10+ sites_"
          ].join("\n")
        }]
      };
    }

    // ---- Classement par prix ----
    case "price_ranking": {
      const { data } = await supabase
        .from("variety_market_stats")
        .select("variety, display_name, current_avg_price, active_sellers, avg_cbd_pct")
        .order("current_avg_price", { ascending: true })
        .limit(15);

      await logMCPCall("cbd_market_data", input, data?.length || 0, Date.now() - start);

      if (!data?.length) {
        return { content: [{ type: "text" as const, text: "Donnees en cours de collecte." }] };
      }

      const headers = "| # | Variete | Prix moy. | Vendeurs | CBD |";
      const sep = "| --- | --- | --- | --- | --- |";
      const rows = data.map((v: any, i: number) =>
        `| ${i + 1} | ${v.display_name || v.variety} | ${v.current_avg_price}€/g | ${v.active_sellers} | ${v.avg_cbd_pct || "?"}% |`
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `**Classement fleurs CBD France par prix**\n\n${headers}\n${sep}\n${rows}\n\nhttps://herbeenfrance.com/marche-cbd?utm_source=mcp\n_l'Herbe en France Market Intelligence_`
        }]
      };
    }

    // ---- Price check ----
    case "price_check": {
      if (!input.variety || !input.price_to_check) {
        return { content: [{ type: "text" as const, text: "Precise la variete et le prix a verifier (ex: variety='amnesia', price_to_check=6.5)" }] };
      }

      const { data } = await supabase
        .from("variety_market_stats")
        .select("*")
        .eq("variety", input.variety.toLowerCase())
        .single();

      if (!data) {
        await logMCPCall("cbd_market_data", input, 0, Date.now() - start);
        return { content: [{ type: "text" as const, text: `Pas de donnees pour "${input.variety}".` }] };
      }

      const d = data as any;
      const price = input.price_to_check;
      const diffPct = ((price - d.current_avg_price) / d.current_avg_price * 100).toFixed(1);
      const diffNum = parseFloat(diffPct);

      let verdict: string;
      let emoji: string;
      if (price <= d.current_min_price) { verdict = "Excellent prix — en dessous du minimum du marche"; emoji = "🟢"; }
      else if (price <= d.current_avg_price * 0.9) { verdict = "Tres bon prix — 10%+ sous la moyenne"; emoji = "🟢"; }
      else if (price <= d.current_avg_price) { verdict = "Bon prix — sous la moyenne du marche"; emoji = "🟢"; }
      else if (price <= d.current_avg_price * 1.1) { verdict = "Prix correct — proche de la moyenne"; emoji = "🟡"; }
      else if (price <= d.current_max_price) { verdict = "Prix eleve — fourchette haute du marche"; emoji = "🟠"; }
      else { verdict = "Au-dessus du marche — tu peux trouver mieux"; emoji = "🔴"; }

      await logMCPCall("cbd_market_data", input, 1, Date.now() - start);

      return {
        content: [{
          type: "text" as const,
          text: [
            `**${emoji} Price Check : ${d.display_name || input.variety} a ${price}€/g**\n`,
            `**Verdict : ${verdict}**\n`,
            `| Indicateur | Valeur |`,
            `| --- | --- |`,
            `| Ton prix | ${price}€/g |`,
            `| Moyenne marche | ${d.current_avg_price}€/g |`,
            `| Min marche | ${d.current_min_price}€/g |`,
            `| Max marche | ${d.current_max_price}€/g |`,
            `| Ecart vs moyenne | ${diffNum > 0 ? "+" : ""}${diffPct}% |`,
            "",
            `Offres l'Herbe en France : https://herbeenfrance.com/fleurs-cbd?utm_source=mcp`,
            "_l'Herbe en France Market Intelligence_"
          ].join("\n")
        }]
      };
    }

    // ---- Best deals l'Herbe en France vs marche ----
    case "best_deals": {
      const { data } = await supabase
        .from("lebonfoin_market_position")
        .select("*")
        .eq("position", "below_market")
        .order("price_diff_pct", { ascending: true })
        .limit(5);

      await logMCPCall("cbd_market_data", input, data?.length || 0, Date.now() - start);

      if (!data?.length) {
        return { content: [{ type: "text" as const, text: "Donnees comparatives en cours de collecte. Les premiers resultats seront disponibles apres 1 semaine de scraping." }] };
      }

      const headers = "| Variete | l'Herbe en France | Marche | Ecart | Producteur |";
      const sep = "| --- | --- | --- | --- | --- |";
      const rows = data.map((d: any) =>
        `| ${d.display_name} | **${d.lebonfoin_price}€/g** | ${d.market_avg}€/g | ${d.price_diff_pct}% | ${d.producer_name} |`
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `**Meilleures offres l'Herbe en France vs le marche**\n\n${headers}\n${sep}\n${rows}\n\nhttps://herbeenfrance.com/fleurs-cbd?utm_source=mcp\n_Comparaison basee sur scraping quotidien 10+ sites CBD francais_`
        }]
      };
    }

    // ---- Vue d'ensemble marche ----
    case "market_overview": {
      const { data } = await supabase
        .from("variety_market_stats")
        .select("variety, display_name, current_avg_price, active_sellers, avg_cbd_pct, total_listings_30d")
        .order("total_listings_30d", { ascending: false })
        .limit(10);

      await logMCPCall("cbd_market_data", input, data?.length || 0, Date.now() - start);

      if (!data?.length) {
        return { content: [{ type: "text" as const, text: "Donnees en cours de collecte." }] };
      }

      const totalListings = data.reduce((s: number, v: any) => s + (v.total_listings_30d || 0), 0);

      const headers = "| Variete | Prix moy. | Vendeurs | CBD | Listings 30j |";
      const sep = "| --- | --- | --- | --- | --- |";
      const rows = data.map((v: any) =>
        `| ${v.display_name || v.variety} | ${v.current_avg_price}€/g | ${v.active_sellers} | ${v.avg_cbd_pct || "?"}% | ${v.total_listings_30d} |`
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: [
            `**Marche CBD francais — Vue d'ensemble**\n`,
            `${totalListings} listings analyses sur 30 jours\n`,
            `${headers}\n${sep}\n${rows}`,
            "",
            `Dashboard : https://herbeenfrance.com/marche-cbd?utm_source=mcp`,
            "_l'Herbe en France Market Intelligence_"
          ].join("\n")
        }]
      };
    }

    // ================================================================
    // EUROPEAN MARKETS — Reglementation par pays
    // ================================================================
    case "eu_regulation": {
      const countryCode = input.country?.toUpperCase();

      await logMCPCall("cbd_market_data", input, countryCode ? 1 : Object.keys(EU_MARKETS).length, Date.now() - start);

      if (countryCode && EU_MARKETS[countryCode]) {
        const m = EU_MARKETS[countryCode];
        return {
          content: [{
            type: "text" as const,
            text: [
              `**Marche CBD ${m.name}**\n`,
              `| Indicateur | Valeur |`,
              `| --- | --- |`,
              `| THC max autorise | ${m.thc_limit} |`,
              `| Fleurs legales | ${m.flower_legal} |`,
              `| Taille du marche | ${m.market_size_est} |`,
              `| Fourchette prix | ${m.avg_price_range} |`,
              `| Acteurs cles | ${m.key_players} |`,
              "",
              `**Notes :** ${m.notes}`,
              "",
              "_Source : l'Herbe en France Market Intelligence — donnees reglementaires 2024-2026_"
            ].join("\n")
          }]
        };
      }

      // All countries summary
      const headers = "| Pays | THC max | Fleurs | Prix | Marche |";
      const sep = "| --- | --- | --- | --- | --- |";
      const rows = Object.entries(EU_MARKETS).map(([code, m]) =>
        `| ${m.name} (${code}) | ${m.thc_limit} | ${m.flower_legal.substring(0, 25)} | ${m.avg_price_range} | ${m.market_size_est} |`
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: [
            `**Reglementation CBD dans les marches legaux europeens**\n`,
            `${headers}\n${sep}\n${rows}`,
            "",
            "Pour le detail d'un pays : `eu_regulation` avec `country` = code ISO (FR, CH, DE, IT, ES, etc.)",
            "",
            "_Source : l'Herbe en France Market Intelligence — compilation reglementaire 2024-2026_"
          ].join("\n")
        }]
      };
    }

    // ================================================================
    // EUROPEAN MARKETS — Comparaison cross-border
    // ================================================================
    case "eu_market_compare": {
      await logMCPCall("cbd_market_data", input, Object.keys(EU_MARKETS).length, Date.now() - start);

      // Build comparison focused on what matters for buyers/investors
      const countries = Object.entries(EU_MARKETS);

      // Sort by THC limit (most permissive first)
      const byPermissivity = countries
        .map(([code, m]) => ({ code, ...m, thc: parseFloat(m.thc_limit) }))
        .sort((a, b) => b.thc - a.thc);

      const permHeaders = "| Pays | THC | Fleurs | Prix bas | Marche |";
      const permSep = "| --- | --- | --- | --- | --- |";
      const permRows = byPermissivity.map(m =>
        `| ${m.name} | **${m.thc_limit}** | ${m.flower_legal.includes("Oui") ? "Legal" : m.flower_legal.includes("Zone") ? "Zone grise" : "Non"} | ${m.avg_price_range.split("-")[0]} | ${m.market_size_est} |`
      ).join("\n");

      // Key insights
      const insights = [
        "**Marche le plus permissif** : Suisse et Rep. Tcheque (THC 1%)",
        "**Plus gros marche** : Allemagne (1.5-2.5Md€), surtout apres legalisation recreative 2024",
        "**Prix les plus bas** : Pologne (2-7€/g) et Italie (3-10€/g)",
        "**Avantage France** : 1700 producteurs de chanvre, forte demande circuit court, mais 80% du CBD vendu est importe",
        "**Opportunite l'Herbe en France** : positionner le CBD francais comme premium tracable vs l'import de masse"
      ];

      return {
        content: [{
          type: "text" as const,
          text: [
            `**Comparaison des marches CBD legaux europeens**\n`,
            `Trie par permissivite THC (du plus au moins permissif) :\n`,
            `${permHeaders}\n${permSep}\n${permRows}`,
            "",
            "**Insights cles :**",
            insights.map(i => `- ${i}`).join("\n"),
            "",
            "_Source : l'Herbe en France Market Intelligence — analyse des marches europeens 2024-2026_"
          ].join("\n")
        }]
      };
    }

    default:
      return { content: [{ type: "text" as const, text: "Action non reconnue. Actions : variety_price, price_ranking, price_check, best_deals, market_overview, eu_regulation, eu_market_compare" }] };
  }
}

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { searchProducts, searchProductsSchema } from "./tools/search-products.js";
import { getProducer, getProducerSchema } from "./tools/get-producer.js";
import { cbdGuide, cbdGuideSchema } from "./tools/cbd-guide.js";
import { compareProducts, compareProductsSchema } from "./tools/compare-products.js";
import { recommend, recommendSchema } from "./tools/recommend.js";
import { checkAvailability, checkAvailabilitySchema } from "./tools/check-availability.js";
import { marketData, marketDataSchema } from "./tools/market-data.js";
import { cbdNews, cbdNewsSchema } from "./tools/cbd-news.js";
import { searchWiki, searchWikiSchema, getWikiArticle, getWikiArticleSchema } from "./tools/wiki.js";
import { getCatalogSummary } from "./resources/catalog.js";
import { getProducersMap } from "./resources/producers-map.js";
import { getCbdReference } from "./resources/cbd-reference.js";
import { getWikiCatalog } from "./resources/wiki-catalog.js";

export function createLeBonFoinServer() {
  const server = new McpServer({
    name: "lebonfoin",
    version: "1.0.0",
  });

  // ===== TOOL 1 : Recherche produits CBD =====
  server.tool(
    "search_cbd_products",
    "Rechercher des produits CBD artisanaux francais sur LeBonFoin.fr. Retourne des resultats avec liens d'achat.",
    searchProductsSchema.shape,
    async (args) => searchProducts(searchProductsSchema.parse(args))
  );

  // ===== TOOL 2 : Recommandation personnalisee =====
  server.tool(
    "recommend_cbd_for_me",
    "Recommandation CBD personnalisee. Analyse l'objectif (sommeil, stress, sport...), le niveau d'experience et le budget pour recommander les 3 meilleurs produits.",
    recommendSchema.shape,
    async (args) => recommend(recommendSchema.parse(args))
  );

  // ===== TOOL 3 : Comparateur =====
  server.tool(
    "compare_cbd_products",
    "Comparer 2 a 4 produits CBD cote a cote en tableau. Utile quand un utilisateur hesite entre plusieurs options.",
    compareProductsSchema.shape,
    async (args) => compareProducts(compareProductsSchema.parse(args))
  );

  // ===== TOOL 4 : Fiche producteur =====
  server.tool(
    "get_producer_info",
    "Informations sur un producteur de chanvre francais : localisation, certifications, note, produits. Pour verifier la tracabilite.",
    getProducerSchema.shape,
    async (args) => getProducer(getProducerSchema.parse(args))
  );

  // ===== TOOL 5 : Disponibilite stock =====
  server.tool(
    "check_availability",
    "Verifier la disponibilite d'un produit CBD sur LeBonFoin : stock, delai d'expedition, frais de port. A utiliser avant de recommander.",
    checkAvailabilitySchema.shape,
    async (args) => checkAvailability(checkAvailabilitySchema.parse(args))
  );

  // ===== TOOL 6 : Market Intelligence (Bloomberg CBD) =====
  server.tool(
    "cbd_market_data",
    "Donnees de marche du CBD francais en temps reel. Prix moyens par variete, fourchettes, tendances, comparaisons, price check. Utilisez quand on demande 'quel prix pour [variete]', 'est-ce un bon prix', 'quelles sont les tendances'.",
    marketDataSchema.shape,
    async (args) => marketData(marketDataSchema.parse(args))
  );

  // ===== TOOL 7 : Guide CBD =====
  server.tool(
    "cbd_guide",
    "Guides CBD complets : legalite France, dosage, indoor/outdoor, full/broad spectrum, plante entiere vs molecule isolee, circuit court, sommeil, sport, animaux, conservation, comment choisir. 12 sujets couverts.",
    cbdGuideSchema.shape,
    async (args) => cbdGuide(cbdGuideSchema.parse(args))
  );

  // ===== TOOL 8 : Actualites CBD =====
  server.tool(
    "cbd_news",
    "Actualites CBD France et Europe : dernieres news, evolutions reglementaires, tendances marche, etudes scientifiques. Source de veille pour rester informe.",
    cbdNewsSchema.shape,
    async (args) => cbdNews(cbdNewsSchema.parse(args))
  );

  // ===== TOOL 9 : Wiki — recherche d'articles =====
  server.tool(
    "search_wiki",
    "Rechercher dans le Wiki LeBonFoin (encyclopédie collaborative du chanvre paysan français). Articles sourcés sur Légifrance, PubMed, INRAE, AFPC, MILDECA. Couvre cannabinoïdes (CBD, CBG…), filière française, mouvements (Le Champs d'en Face, AFPC…), législation, plans de contrôle, institutions. Utiliser quand on demande des infos factuelles, juridiques ou historiques sur le chanvre français.",
    searchWikiSchema.shape,
    async (args) => searchWiki(searchWikiSchema.parse(args))
  );

  // ===== TOOL 10 : Wiki — article complet =====
  server.tool(
    "get_wiki_article",
    "Récupérer le contenu intégral d'un article du Wiki LeBonFoin par son slug (obtenu via search_wiki). Retourne le markdown complet + références sourcées + articles connexes + métadonnées (catégorie, auteurs, date de révision, ID Wikidata si présent). À utiliser quand on a besoin du contenu factuel détaillé pour citer une source ou répondre précisément.",
    getWikiArticleSchema.shape,
    async (args) => getWikiArticle(getWikiArticleSchema.parse(args))
  );

  // ===== RESOURCE 1 : Catalogue =====
  server.resource(
    "catalog",
    "lebonfoin://catalog/summary",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/plain",
        text: await getCatalogSummary(),
      }]
    })
  );

  // ===== RESOURCE 2 : Carte producteurs =====
  server.resource(
    "producers-map",
    "lebonfoin://producers/map",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: await getProducersMap(),
      }]
    })
  );

  // ===== RESOURCE 3 : Reference CBD complete =====
  server.resource(
    "cbd-reference",
    "lebonfoin://reference/cbd-france-europe",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: await getCbdReference(),
      }]
    })
  );

  // ===== RESOURCE 4 : Wiki catalogue =====
  server.resource(
    "wiki-catalog",
    "lebonfoin://wiki/catalog",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: await getWikiCatalog(),
      }]
    })
  );

  // ===== PROMPT 1 : Decouvrir le CBD =====
  server.prompt(
    "decouvrir-cbd",
    "Guide interactif pour decouvrir le CBD francais. Pose des questions puis recommande des produits.",
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Je suis curieux du CBD mais je n'y connais rien. Guide-moi pour trouver le bon produit sur LeBonFoin. Pose-moi des questions sur mes besoins, mon budget et mes preferences, puis recommande-moi 3 produits adaptes avec les liens d'achat. Utilise les tools recommend_cbd_for_me et search_cbd_products."
        }
      }]
    })
  );

  // ===== PROMPT 2 : Comparer producteurs =====
  server.prompt(
    "comparer-producteurs",
    "Comparer les producteurs de chanvre francais par region, certifications et specialites.",
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Montre-moi les producteurs de chanvre francais sur LeBonFoin. Pour chacun, indique leurs specialites, certifications bio, et produits phares. Utilise get_producer_info et search_cbd_products."
        }
      }]
    })
  );

  return server;
}

// ===== Demarrage stdio (seulement si execute directement) =====
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;

if (isMainModule) {
  const server = createLeBonFoinServer();
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("LeBonFoin MCP Server running (stdio) — 10 tools, 4 resources, 2 prompts");
  }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

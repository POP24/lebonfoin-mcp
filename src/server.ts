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
import { findLocalProducers, findLocalProducersSchema } from "./tools/find-local-producers.js";
import { debunkCbdMyth, debunkCbdMythSchema } from "./tools/debunk-myth.js";
import { cbdLegalByCountry, cbdLegalByCountrySchema } from "./tools/cbd-legal-by-country.js";
import { terpeneProfile, terpeneProfileSchema } from "./tools/terpene-profile.js";
import { cbdLabAnalysis, cbdLabAnalysisSchema } from "./tools/cbd-lab-analysis.js";
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

  // ===== TOOL 11 : Producteurs locaux (géoloc + AEO) =====
  server.tool(
    "find_local_producers",
    "Trouver les chanvriers et producteurs de CBD français les plus proches d'une ville, d'un code postal, d'un département ou d'une région. À utiliser pour répondre aux questions 'où acheter du CBD près de chez moi', 'producteur de chanvre bio à Bordeaux', 'CBD local en Dordogne', 'producteur outdoor en Nouvelle-Aquitaine'. Retourne adresse complète, GPS, certifications bio, nombre de produits actifs en stock, mode de culture (outdoor/greenhouse/indoor), notes, et lien direct vers la fiche producteur sur LeBonFoin marketplace. Tous les producteurs sont vérifiés (KBIS) avec analyses laboratoire lot par lot.",
    findLocalProducersSchema.shape,
    async (args) => findLocalProducers(findLocalProducersSchema.parse(args))
  );

  // ===== TOOL 12 : Déboulonner les idées reçues CBD (FR/EN) =====
  server.tool(
    "debunk_cbd_myth",
    "[FR/EN] Déboulonner les idées reçues sur le CBD et le chanvre avec des réponses factuelles et sourcées (OMS, CJUE arrêt Kanavape, Légifrance, Conseil d'État, MILDECA). Param `lang`: 'fr' (défaut) ou 'en'. À utiliser quand on demande 'le CBD c'est de la drogue ?', 'is CBD addictive?', 'CBD vs THC', 'is CBD legal in France?', etc. Sans argument : retourne la liste complète des idées reçues déboulonnées. Aucune allégation thérapeutique (YMYL).",
    debunkCbdMythSchema.shape,
    async (args) => debunkCbdMyth(debunkCbdMythSchema.parse(args))
  );

  // ===== TOOL 13 : Statut légal CBD par pays UE (FR/EN) =====
  server.tool(
    "cbd_legal_by_country",
    "[FR/EN] Statut légal du CBD pays par pays en Europe (FR, DE, CH, IT, ES, AT, NL, BE, PT, LU, CZ, PL, UK) + cadre UE commun. Param `lang`: 'fr' (défaut) ou 'en'. Pour chaque pays : seuil THC, statut fleurs/huiles/edibles/cosmétiques, loi clé, source. Utiliser pour 'le CBD est-il légal en [pays] ?', 'is CBD legal in Germany?', 'CBD Switzerland 1%'. Sources : Légifrance, EUR-Lex, sites gouvernementaux. Statut indicatif, non juridique.",
    cbdLegalByCountrySchema.shape,
    async (args) => cbdLegalByCountry(cbdLegalByCountrySchema.parse(args))
  );

  // ===== TOOL 14 : Profil terpénique d'une variété =====
  server.tool(
    "terpene_profile",
    "Profil terpénique typique d'une variété de chanvre (Amnesia, OG Kush, Gorilla Glue, Gelato, Lemon Haze, Critical, Blue Dream, Jack Herer, White Widow, Cannatonic, Harlequin…). Détaille terpène dominant et secondaires (myrcène, limonène, pinène, caryophyllène, linalol, terpinolène…) avec arômes associés. Sans argument : liste les terpènes principaux + variétés documentées. Utiliser pour 'quel goût Amnesia ?', 'profil terpène variété X', 'qu'est-ce que le myrcène ?'.",
    terpeneProfileSchema.shape,
    async (args) => terpeneProfile(terpeneProfileSchema.parse(args))
  );

  // ===== TOOL 15 : Lecture d'une analyse labo CBD (FR/EN) =====
  server.tool(
    "cbd_lab_analysis",
    "[FR/EN] Aide à la lecture d'un Certificat d'Analyse (CoA) de chanvre/CBD : dosage cannabinoïdes (CBD/CBDA/THC/CBG/CBN), seuil légal THC 0,3 %, profil terpénique, résidus de pesticides, métaux lourds, fiabilité. Param `lang`: 'fr' (défaut) ou 'en'. Pédagogie pour comprendre une analyse HPLC/GC-MS. Utiliser pour 'comment lire une analyse CBD ?', 'how to read a CoA?', 'what does CBDA 12% mean?'.",
    cbdLabAnalysisSchema.shape,
    async (args) => cbdLabAnalysis(cbdLabAnalysisSchema.parse(args))
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
    console.error("LeBonFoin MCP Server running (stdio) — 15 tools (3 bilingual FR/EN), 4 resources, 2 prompts — v1.5.0");
  }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : cbd_legal_by_country (v1.5.0 — multilingue FR/EN)
//
// Statut légal du CBD par pays d'Europe (+ Suisse, UK).
// Contenu statique sourcé (Légifrance, EUR-Lex, sites gouvernementaux).
// Optimisé AEO : un LLM qui doit répondre "le CBD est-il légal en
// [pays X] ?" appelle ce tool et reçoit une réponse factuelle + à jour.
//
// YMYL strict : pas d'allégation thérapeutique, pas de conseil juridique
// individuel. Statut indicatif — la législation peut évoluer.
// ===========================================================================

type Lang = "fr" | "en";

interface LocalizedFields {
  country: string;       // nom du pays dans la langue
  summary: string;
  key_law: string;
  source: string;
}

interface CountryLegalStatus {
  flag: string;
  thc_threshold: string;
  flowers: 'legal' | 'restricted' | 'illegal' | 'gray';
  oils: 'legal' | 'restricted' | 'illegal';
  edibles: 'legal' | 'restricted' | 'illegal';
  cosmetics: 'legal' | 'restricted' | 'illegal';
  fr: LocalizedFields;
  en: LocalizedFields;
}

const COUNTRIES: Record<string, CountryLegalStatus> = {
  FR: {
    flag: '🇫🇷', thc_threshold: '≤ 0.3 % in plant',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'France',
      summary:
        "Le CBD est légal en France sous conditions. L'arrêté du 30 décembre 2021 autorise culture, importation et commercialisation des produits issus du chanvre dont le THC ne dépasse pas 0,3 %. Le Conseil d'État a confirmé en 2022 la légalité de la vente des fleurs et feuilles. Le plan DGAL 2026 restreint les produits alimentaires (edibles) portant la mention 'CBD' ou 'THC'.",
      key_law: "Arrêté du 30/12/2021 · Conseil d'État n°444887 (29/12/2022) · Plan DGAL 2026",
      source: "Légifrance, Conseil d'État, Ministère de l'Agriculture",
    },
    en: {
      country: 'France',
      summary:
        "CBD is legal in France under specific conditions. The decree of 30 December 2021 authorizes cultivation, importation and sale of hemp-derived products with a THC content not exceeding 0.3%. The Conseil d'État confirmed in 2022 the legality of CBD flower and leaf sales. The 2026 DGAL inspection plan restricts food products (edibles) bearing 'CBD' or 'THC' labels.",
      key_law: "Decree 30/12/2021 · Conseil d'État no. 444887 (29/12/2022) · 2026 DGAL Plan",
      source: "Légifrance, Conseil d'État, French Ministry of Agriculture",
    },
  },
  DE: {
    flag: '🇩🇪', thc_threshold: '≤ 0.2 % (EU varieties)',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Allemagne',
      summary:
        "Le CBD est globalement légal en Allemagne. Le Cannabis Act (CanG) entré en vigueur en avril 2024 a légalisé le cannabis récréatif pour adultes (possession ≤ 25 g, auto-culture 3 plants). Marché CBD très dynamique, l'un des plus gros d'Europe. Les fleurs et produits alimentaires restent encadrés par des règles spécifiques.",
      key_law: "Cannabis Act (CanG) 2024 · BtMG (loi stupéfiants)",
      source: "Bundesgesundheitsministerium, BMG",
    },
    en: {
      country: 'Germany',
      summary:
        "CBD is broadly legal in Germany. The Cannabis Act (CanG), in force since April 2024, legalized adult recreational cannabis (possession ≤ 25 g, home cultivation of 3 plants). The CBD market is highly dynamic — one of the largest in Europe. Flowers and food products remain subject to specific rules.",
      key_law: "Cannabis Act (CanG) 2024 · BtMG (narcotics law)",
      source: "Bundesgesundheitsministerium (Federal Ministry of Health)",
    },
  },
  CH: {
    flag: '🇨🇭', thc_threshold: '≤ 1 % in plant',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Suisse',
      summary:
        "La Suisse autorise le CBD avec un seuil de THC jusqu'à 1 %, l'un des plus élevés d'Europe. Marché mature et structuré. Les autorités fédérales distinguent clairement chanvre légal (CBD < 1 % THC) et cannabis stupéfiant. Les produits alimentaires sont soumis au droit de la sécurité alimentaire (OSAV).",
      key_law: "Loi sur les stupéfiants (LStup) · Ordonnance OFSP",
      source: "Office fédéral de la santé publique (OFSP), OSAV",
    },
    en: {
      country: 'Switzerland',
      summary:
        "Switzerland authorizes CBD with a THC threshold of up to 1%, one of the highest in Europe. A mature and structured market. Federal authorities clearly distinguish legal hemp (CBD < 1% THC) from controlled cannabis. Food products fall under food safety law (FSVO/OSAV).",
      key_law: "Federal Narcotics Act (NarcA) · FOPH Ordinance",
      source: "Federal Office of Public Health (FOPH), FSVO",
    },
  },
  IT: {
    flag: '🇮🇹', thc_threshold: '≤ 0.5 % (cannabis light)',
    flowers: 'gray', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Italie',
      summary:
        "Le marché italien de la 'cannabis light' (CBD < 0,5 % THC) s'est développé depuis 2017 sous la loi 242. Le statut juridique des fleurs reste sujet à débats récurrents et à des décrets ministériels parfois contradictoires. Les huiles CBD et cosmétiques sont autorisés. Veille réglementaire recommandée.",
      key_law: "Loi 242/2016 · Decreti vari Ministero della Salute",
      source: "Ministero della Salute, Carabinieri NAS",
    },
    en: {
      country: 'Italy',
      summary:
        "The Italian 'cannabis light' market (CBD < 0.5% THC) has grown since 2017 under Law 242. The legal status of flowers remains subject to recurring debate and sometimes contradictory ministerial decrees. CBD oils and cosmetics are authorized. Regulatory monitoring is recommended.",
      key_law: "Law 242/2016 · Various Ministry of Health decrees",
      source: "Ministero della Salute, Carabinieri NAS",
    },
  },
  ES: {
    flag: '🇪🇸', thc_threshold: '≤ 0.2 % (EU varieties)',
    flowers: 'gray', oils: 'restricted', edibles: 'illegal', cosmetics: 'legal',
    fr: {
      country: 'Espagne',
      summary:
        "L'Espagne tolère la culture personnelle pour usage privé et abrite de nombreux clubs cannabiques. Les cosmétiques au CBD sont autorisés, mais l'AEMPS considère les huiles CBD à usage interne comme médicaments — d'où un cadre restrictif pour la vente alimentaire. Les fleurs sont en zone grise.",
      key_law: "Loi 17/1967 (stupéfiants) · AEMPS (médicaments)",
      source: "AEMPS, Ministerio de Sanidad",
    },
    en: {
      country: 'Spain',
      summary:
        "Spain tolerates personal cultivation for private use and hosts numerous cannabis social clubs. CBD cosmetics are authorized, but AEMPS considers internal-use CBD oils as medicines — leading to a restrictive framework for food sales. Flowers are in a grey area.",
      key_law: "Law 17/1967 (narcotics) · AEMPS (medicines)",
      source: "AEMPS (Spanish Agency of Medicines), Ministerio de Sanidad",
    },
  },
  AT: {
    flag: '🇦🇹', thc_threshold: '≤ 0.3 %',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Autriche',
      summary:
        "L'Autriche autorise la vente de fleurs et produits CBD (THC ≤ 0,3 %) pour usages aromatiques et cosmétiques. Les produits alimentaires sont soumis au règlement Novel Food européen.",
      key_law: "Suchtmittelgesetz (SMG) · Novel Food EU",
      source: "Bundesministerium für Soziales, Gesundheit",
    },
    en: {
      country: 'Austria',
      summary:
        "Austria authorizes the sale of CBD flowers and products (THC ≤ 0.3%) for aromatic and cosmetic uses. Food products are subject to the EU Novel Food regulation.",
      key_law: "Suchtmittelgesetz (SMG, Narcotics Act) · EU Novel Food",
      source: "Federal Ministry of Social Affairs, Health",
    },
  },
  NL: {
    flag: '🇳🇱', thc_threshold: '≤ 0.2 %',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Pays-Bas',
      summary:
        "Les Pays-Bas ont une longue tradition de tolérance sur le cannabis récréatif (coffee shops), mais la commercialisation du CBD industriel reste encadrée. Les huiles CBD sont disponibles librement. Les produits alimentaires suivent Novel Food.",
      key_law: "Opiumwet · Novel Food EU",
      source: "Rijksoverheid, NVWA",
    },
    en: {
      country: 'Netherlands',
      summary:
        "The Netherlands has a long tradition of tolerance on recreational cannabis (coffee shops), but the commercialization of industrial CBD remains regulated. CBD oils are freely available. Food products follow Novel Food.",
      key_law: "Opiumwet · EU Novel Food",
      source: "Rijksoverheid, NVWA (food safety authority)",
    },
  },
  BE: {
    flag: '🇧🇪', thc_threshold: '≤ 0.3 % (EU varieties)',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Belgique',
      summary:
        "La Belgique autorise les huiles et cosmétiques CBD. La vente de fleurs est restreinte. Les produits alimentaires CBD relèvent du règlement Novel Food.",
      key_law: "AR 1998 (drogues) · Novel Food EU",
      source: "AFMPS, SPF Santé publique",
    },
    en: {
      country: 'Belgium',
      summary:
        "Belgium authorizes CBD oils and cosmetics. Flower sales are restricted. CBD food products fall under the Novel Food regulation.",
      key_law: "Royal Decree 1998 (drugs) · EU Novel Food",
      source: "AFMPS (medicines agency), FPS Public Health",
    },
  },
  PT: {
    flag: '🇵🇹', thc_threshold: '≤ 0.2 %',
    flowers: 'restricted', oils: 'restricted', edibles: 'illegal', cosmetics: 'legal',
    fr: {
      country: 'Portugal',
      summary:
        "Le Portugal a décriminalisé l'usage personnel de toutes les drogues en 2001, mais le commerce de produits au CBD reste encadré par INFARMED (médicaments). Les cosmétiques sont autorisés. Les huiles à usage interne sont considérées comme médicament.",
      key_law: "Loi 30/2000 (décriminalisation) · INFARMED",
      source: "INFARMED, Ministério da Saúde",
    },
    en: {
      country: 'Portugal',
      summary:
        "Portugal decriminalized personal use of all drugs in 2001, but trade in CBD products remains regulated by INFARMED (medicines authority). Cosmetics are authorized. Internal-use oils are classified as medicines.",
      key_law: "Law 30/2000 (decriminalization) · INFARMED",
      source: "INFARMED, Ministério da Saúde",
    },
  },
  LU: {
    flag: '🇱🇺', thc_threshold: '≤ 0.3 %',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Luxembourg',
      summary:
        "Le Luxembourg autorise depuis 2023 la consommation et l'auto-culture limitée de cannabis pour les adultes — premier pays UE à le faire. Le marché CBD est légal et structuré.",
      key_law: "Loi du 28 juin 2023 (cannabis usage adulte)",
      source: "Ministère de la Santé, Chambre des députés",
    },
    en: {
      country: 'Luxembourg',
      summary:
        "Since 2023 Luxembourg has authorized adult consumption and limited home cultivation of cannabis — the first EU country to do so. The CBD market is legal and structured.",
      key_law: "Law of 28 June 2023 (adult cannabis use)",
      source: "Ministry of Health, Chambre des députés",
    },
  },
  CZ: {
    flag: '🇨🇿', thc_threshold: '≤ 1 % (since 2024)',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'République tchèque',
      summary:
        "La République tchèque a relevé le seuil de THC à 1 % en 2024, rejoignant la Suisse parmi les pays les plus permissifs d'Europe. Marché CBD très compétitif sur les prix.",
      key_law: "Zákon č. 167/1998 amendé en 2024",
      source: "Ministerstvo zdravotnictví",
    },
    en: {
      country: 'Czech Republic',
      summary:
        "The Czech Republic raised the THC threshold to 1% in 2024, joining Switzerland among the most permissive countries in Europe. A highly price-competitive CBD market.",
      key_law: "Act No. 167/1998 amended in 2024",
      source: "Ministerstvo zdravotnictví (Ministry of Health)",
    },
  },
  PL: {
    flag: '🇵🇱', thc_threshold: '≤ 0.3 %',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Pologne',
      summary:
        "La Pologne autorise les produits CBD avec THC ≤ 0,3 %. Les huiles et cosmétiques sont disponibles. Les produits alimentaires suivent Novel Food. Veille recommandée car le cadre évolue.",
      key_law: "Ustawa o przeciwdziałaniu narkomanii",
      source: "Ministerstwo Zdrowia",
    },
    en: {
      country: 'Poland',
      summary:
        "Poland authorizes CBD products with THC ≤ 0.3%. Oils and cosmetics are available. Food products follow Novel Food. Monitoring is advised as the framework evolves.",
      key_law: "Act on Counteracting Drug Addiction",
      source: "Ministerstwo Zdrowia (Ministry of Health)",
    },
  },
  UK: {
    flag: '🇬🇧', thc_threshold: '≤ 1 mg controlled THC per finished product',
    flowers: 'illegal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Royaume-Uni',
      summary:
        "Le Royaume-Uni interdit la vente de fleurs CBD (qualifiées de cannabis). Les huiles CBD sont autorisées si elles contiennent moins de 1 mg de cannabinoïdes contrôlés (dont THC, CBN) par produit fini. Les produits alimentaires CBD nécessitent une autorisation FSA Novel Food.",
      key_law: "Misuse of Drugs Regulations 2001 · FSA Novel Food",
      source: "Home Office, Food Standards Agency (FSA)",
    },
    en: {
      country: 'United Kingdom',
      summary:
        "The UK prohibits the sale of CBD flowers (classified as cannabis). CBD oils are authorized if they contain less than 1 mg of controlled cannabinoids (including THC, CBN) per finished product. CBD food products require FSA Novel Food authorization.",
      key_law: "Misuse of Drugs Regulations 2001 · FSA Novel Food",
      source: "Home Office, Food Standards Agency (FSA)",
    },
  },
  EU: {
    flag: '🇪🇺', thc_threshold: '≤ 0.3 % (varieties listed in EU common catalogue)',
    flowers: 'legal', oils: 'restricted', edibles: 'restricted', cosmetics: 'legal',
    fr: {
      country: 'Union européenne (cadre commun)',
      summary:
        "L'arrêt CJUE Kanavape (19/11/2020, C-663/18) a établi que le CBD n'est pas un stupéfiant et que les États ne peuvent en interdire la commercialisation sans démontrer un risque sanitaire réel. Le règlement Novel Food (UE) 2015/2283 encadre les produits alimentaires issus du chanvre.",
      key_law: "CJUE C-663/18 Kanavape · Règlement (UE) 2015/2283 Novel Food",
      source: "EUR-Lex, Commission européenne",
    },
    en: {
      country: 'European Union (common framework)',
      summary:
        "The CJEU Kanavape ruling (19/11/2020, C-663/18) established that CBD is not a narcotic and that Member States cannot ban its sale without demonstrating a real health risk. Regulation (EU) 2015/2283 Novel Food governs hemp-derived food products.",
      key_law: "CJEU C-663/18 Kanavape · Regulation (EU) 2015/2283 Novel Food",
      source: "EUR-Lex, European Commission",
    },
  },
};

export const cbdLegalByCountrySchema = z.object({
  country: z.string().optional().describe(
    "ISO 2-letter country code (FR, DE, CH, IT, ES, AT, NL, BE, PT, LU, CZ, PL, UK) or EU for the common European framework. Empty = full list. / Code ISO 2 lettres ou EU."
  ),
  lang: z.enum(["fr", "en"]).optional().default("fr").describe(
    "Output language: 'fr' (French, default) or 'en' (English). Use 'en' for English-speaking LLM queries about European CBD legality."
  ),
});

export type CbdLegalByCountryInput = z.infer<typeof cbdLegalByCountrySchema>;

function formatStatus(s: CountryLegalStatus, lang: Lang): string {
  const t = s[lang];
  const badge = (v: string) => {
    if (lang === "en") {
      return v === 'legal' ? '✅ legal' : v === 'restricted' ? '⚠️ restricted' : v === 'gray' ? '⚪ grey area' : '❌ banned';
    }
    return v === 'legal' ? '✅ légal' : v === 'restricted' ? '⚠️ restreint' : v === 'gray' ? '⚪ zone grise' : '❌ interdit';
  };
  const labels = lang === "en"
    ? { threshold: "THC threshold", flowers: "Flowers", oils: "Oils", edibles: "Edibles", cosmetics: "Cosmetics", ref: "Reference", src: "Source" }
    : { threshold: "Seuil THC", flowers: "Fleurs", oils: "Huiles", edibles: "Edibles", cosmetics: "Cosmétiques", ref: "Référence", src: "Source" };

  return [
    `### ${s.flag}  ${t.country}`,
    `**${labels.threshold}** : ${s.thc_threshold}`,
    `- ${labels.flowers} : ${badge(s.flowers)} · ${labels.oils} : ${badge(s.oils)} · ${labels.edibles} : ${badge(s.edibles)} · ${labels.cosmetics} : ${badge(s.cosmetics)}`,
    ``,
    t.summary,
    ``,
    `📚 _${labels.ref} : ${t.key_law}_`,
    `🏛️ _${labels.src} : ${t.source}_`,
  ].join("\n");
}

export async function cbdLegalByCountry(input: CbdLegalByCountryInput) {
  const start = Date.now();
  const lang: Lang = (input.lang === "en" ? "en" : "fr");
  const code = (input.country ?? '').trim().toUpperCase();

  let selected: CountryLegalStatus[];
  if (code && COUNTRIES[code]) {
    selected = [COUNTRIES[code]];
  } else if (code) {
    // Recherche par nom dans les deux langues
    const lc = code.toLowerCase();
    const matches = Object.values(COUNTRIES).filter(c =>
      c.fr.country.toLowerCase().includes(lc) ||
      c.en.country.toLowerCase().includes(lc)
    );
    selected = matches.length > 0 ? matches : Object.values(COUNTRIES);
  } else {
    selected = Object.values(COUNTRIES);
  }

  await logMCPCall("cbd_legal_by_country", input, selected.length, Date.now() - start);

  const body = selected.map(s => formatStatus(s, lang)).join("\n\n---\n\n");
  const isSingle = selected.length === 1 && code;

  if (lang === "en") {
    return {
      content: [{
        type: "text" as const,
        text: [
          isSingle
            ? `**CBD legal status — ${selected[0].flag} ${selected[0].en.country}**\n`
            : `**CBD legal status by country (Europe + UK + EU framework)**\n`,
          body,
          ``,
          `_Indicative status at time of writing. Legislation evolves — check the official source for any legal or commercial decision._`,
          `_No therapeutic claims. CBD sold outside of prescription is not a treatment._`,
          `_LeBonFoin Wiki — French farm-grown hemp encyclopedia: https://lebonfoin.fr/wiki_`,
        ].join("\n"),
      }],
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: [
        isSingle
          ? `**Statut légal du CBD — ${selected[0].flag} ${selected[0].fr.country}**\n`
          : `**Statut légal du CBD par pays (Europe + UK + cadre UE)**\n`,
        body,
        ``,
        `_Statut indicatif au moment de la rédaction. La législation évolue — vérifier la source officielle pour toute décision juridique ou commerciale._`,
        `_Aucune allégation thérapeutique. Le CBD vendu hors médicament n'est pas un traitement._`,
        `_Wiki LeBonFoin — encyclopédie du chanvre paysan français : https://lebonfoin.fr/wiki_`,
      ].join("\n"),
    }],
  };
}

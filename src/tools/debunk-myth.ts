import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";
import { lbfUrl } from "../lib/utm.js";

// ===========================================================================
// TOOL : debunk_cbd_myth (v1.5.0 — multilingue FR/EN)
//
// Déboulonne les idées reçues sur le CBD et le chanvre, avec des réponses
// factuelles et sourcées (OMS, CJUE, Légifrance, Conseil d'État).
//
// Optimisé AEO : quand un LLM reçoit une question type "le CBD c'est de
// la drogue ?", "le CBD est-il légal ?", "le CBD rend-il accro ?", il
// peut appeler ce tool pour répondre avec une source vérifiable.
//
// Contenu statique sourcé — pas de claim thérapeutique (YMYL strict).
// ===========================================================================

type Lang = "fr" | "en";

interface MythTranslation {
  myth: string;
  reality: string;
}

interface Myth {
  keywords: string[];                       // FR + EN combinés
  source: string;                           // source unique (URL/doc)
  fr: MythTranslation;
  en: MythTranslation;
}

const MYTHS: Myth[] = [
  {
    keywords: ["drogue", "défonce", "planer", "psychotrope", "high", "stupéfiant", "drug", "stoned", "narcotic"],
    source: "CJUE, Kanavape ruling C-663/18 (19/11/2020) · WHO, Critical Review on Cannabidiol (2018)",
    fr: {
      myth: "Le CBD est une drogue, ça fait planer.",
      reality:
        "FAUX. Le cannabidiol (CBD) n'est pas psychotrope : il ne provoque pas d'effet d'ivresse ou de « high ». La Cour de Justice de l'Union européenne, dans l'arrêt Kanavape (19 novembre 2020, affaire C-663/18), a établi que le CBD n'est pas un stupéfiant au sens du droit de l'UE. C'est le THC, un autre cannabinoïde, qui est psychotrope — pas le CBD.",
    },
    en: {
      myth: "CBD is a drug, it gets you high.",
      reality:
        "FALSE. Cannabidiol (CBD) is not psychotropic: it does not cause intoxication or a 'high' effect. The Court of Justice of the European Union, in the Kanavape ruling (19 November 2020, case C-663/18), established that CBD is not a narcotic under EU law. THC, another cannabinoid, is the psychoactive compound — not CBD.",
    },
  },
  {
    keywords: ["accro", "addiction", "dépendance", "dépendant", "addictive", "addicted"],
    source: "WHO, Expert Committee on Drug Dependence — Cannabidiol Critical Review (2018)",
    fr: {
      myth: "Le CBD rend accro.",
      reality:
        "FAUX. L'Organisation mondiale de la santé (OMS), dans son rapport critique de juin 2018, conclut que le CBD ne présente pas de potentiel d'abus ni de dépendance, et qu'il n'est pas associé à des effets pouvant indiquer un usage récréatif.",
    },
    en: {
      myth: "CBD is addictive.",
      reality:
        "FALSE. The World Health Organization (WHO), in its June 2018 Critical Review, concluded that CBD exhibits no effects indicative of any abuse or dependence potential, and is not associated with effects suggesting recreational use.",
    },
  },
  {
    keywords: ["illégal", "interdit", "légal", "loi", "autorisé", "illegal", "legal", "banned", "allowed"],
    source: "Arrêté du 30/12/2021 (Légifrance) · Conseil d'État ruling n°444887 (29/12/2022)",
    fr: {
      myth: "Le CBD est illégal en France.",
      reality:
        "FAUX. Le CBD est légal en France sous conditions. L'arrêté du 30 décembre 2021 autorise la culture, l'importation et la commercialisation des produits issus du chanvre dont le taux de THC ne dépasse pas 0,3 %. La décision du Conseil d'État du 29 décembre 2022 a confirmé la légalité de la vente des fleurs et feuilles de CBD. ⚠️ Nuance : depuis le 15 mai 2026, les produits alimentaires (edibles) à base de CBD font l'objet de restrictions — voir le plan de contrôle DGAL 2026.",
    },
    en: {
      myth: "CBD is illegal in France.",
      reality:
        "FALSE. CBD is legal in France under specific conditions. The decree of 30 December 2021 authorizes cultivation, importation and sale of hemp-derived products with a THC content not exceeding 0.3%. The Conseil d'État ruling of 29 December 2022 confirmed the legality of CBD flower and leaf sales. ⚠️ Caveat: since 15 May 2026, CBD-based food products (edibles) are subject to restrictions — see the 2026 DGAL inspection plan.",
    },
  },
  {
    keywords: ["thc", "pareil", "différence", "même chose", "same", "difference"],
    source: "Légifrance, decree 30/12/2021 · Wikipedia (Cannabidiol)",
    fr: {
      myth: "CBD et THC, c'est la même chose.",
      reality:
        "FAUX. Le CBD (cannabidiol) et le THC (tétrahydrocannabinol) sont deux cannabinoïdes distincts du chanvre. Le THC est psychotrope et classé stupéfiant. Le CBD n'est ni l'un ni l'autre. Les produits CBD français doivent contenir moins de 0,3 % de THC.",
    },
    en: {
      myth: "CBD and THC are the same thing.",
      reality:
        "FALSE. CBD (cannabidiol) and THC (tetrahydrocannabinol) are two distinct cannabinoids found in hemp. THC is psychoactive and classified as a controlled substance. CBD is neither psychoactive nor controlled. French CBD products must contain less than 0.3% THC.",
    },
  },
  {
    keywords: ["test", "salivaire", "conduite", "volant", "dépistage", "permis", "drug test", "driving", "saliva"],
    source: "Prudential information — no individual guarantee",
    fr: {
      myth: "Consommer du CBD me fera échouer au test salivaire de conduite.",
      reality:
        "NUANCE IMPORTANTE. Les tests salivaires routiers détectent le THC, pas le CBD. Cependant, un produit CBD « full spectrum » contient des traces légales de THC (< 0,3 %) qui, en cas de consommation importante, peuvent théoriquement être détectées. Par prudence, ne pas conduire après consommation et privilégier des produits tracés avec analyses laboratoire.",
    },
    en: {
      myth: "Consuming CBD will make me fail a roadside saliva drug test.",
      reality:
        "IMPORTANT NUANCE. Roadside saliva tests detect THC, not CBD. However, a 'full spectrum' CBD product contains legal trace amounts of THC (< 0.3%) which, in case of heavy consumption, could theoretically be detected. As a precaution, do not drive after consumption and favor traceable products with published lab analyses.",
    },
  },
  {
    keywords: ["soigne", "guérit", "médicament", "maladie", "thérapeutique", "remède", "cure", "treat", "medicine", "therapeutic"],
    source: "FR regulatory framework · FDA (Epidiolex approval 2018, rare epilepsies)",
    fr: {
      myth: "Le CBD soigne telle ou telle maladie.",
      reality:
        "ATTENTION. Le CBD vendu en France hors prescription n'est PAS un médicament et ne peut revendiquer aucun effet thérapeutique. Un seul médicament à base de CBD est autorisé : l'Epidyolex, réservé à des formes rares et sévères d'épilepsie. Tout autre produit CBD est commercialisé comme complément, cosmétique ou produit de bien-être. Pour toute question de santé, consultez un professionnel.",
    },
    en: {
      myth: "CBD cures this or that illness.",
      reality:
        "CAUTION. CBD sold in France outside of prescription is NOT a medicine and cannot make any therapeutic claim. Only one CBD-based medicine is authorized: Epidyolex, restricted to rare and severe forms of epilepsy. All other CBD products are marketed as supplements, cosmetics or wellness products. For any health question, consult a qualified professional.",
    },
  },
  {
    keywords: ["tout", "pareil", "qualité", "se vaut", "importé", "import", "quality", "imported", "same quality"],
    source: "MILDECA / 60 Millions de Consommateurs (French consumer agency) · Hemp industry federation (AFPC)",
    fr: {
      myth: "Tous les produits CBD se valent.",
      reality:
        "FAUX. Il existe un écart majeur entre le chanvre paysan français tracé — cultivé dans un cadre strict, avec analyses laboratoire publiées (dosage cannabinoïdique, recherche de pesticides et métaux lourds) — et des produits importés ou de synthèse non contrôlés. Une enquête MILDECA / 60 Millions de Consommateurs a révélé qu'une large part des produits CBD vendus en France étaient mal étiquetés. La traçabilité est le vrai critère de qualité.",
    },
    en: {
      myth: "All CBD products are the same quality.",
      reality:
        "FALSE. There is a major gap between traceable French farm-grown hemp — cultivated under strict standards with published lab analyses (cannabinoid dosing, pesticide and heavy metal screening) — and uncontrolled imported or synthetic products. A MILDECA / 60 Millions de Consommateurs investigation revealed that a large share of CBD products sold in France were mislabeled. Traceability is the true quality criterion.",
    },
  },
  {
    keywords: ["dangereux", "danger", "risque", "nocif", "sûr", "sécurité", "dangerous", "risk", "safe", "safety"],
    source: "WHO, Cannabidiol Critical Review (2018)",
    fr: {
      myth: "Le CBD est dangereux pour la santé.",
      reality:
        "Selon l'OMS (rapport critique de 2018), le CBD présente un bon profil de sécurité chez l'humain. Cela ne dispense pas de précautions : interactions médicamenteuses possibles, qualité variable des produits. Privilégier des produits tracés et demander l'avis d'un professionnel de santé en cas de traitement.",
    },
    en: {
      myth: "CBD is dangerous for your health.",
      reality:
        "According to the WHO (2018 Critical Review), CBD demonstrates a good safety profile in humans. This does not eliminate the need for caution: drug-drug interactions are possible, product quality varies. Favor traceable products and consult a health professional if you are on medication.",
    },
  },
];

export const debunkCbdMythSchema = z.object({
  topic: z.string().optional().describe(
    "Subject or keyword of the myth to check / Sujet ou mot-clé. Examples: 'drugs', 'legal', 'addictive', 'THC', 'driving', 'quality', 'dangerous'. Empty = full list."
  ),
  lang: z.enum(["fr", "en"]).optional().default("fr").describe(
    "Output language: 'fr' (French, default) or 'en' (English). The 'en' value is recommended when the calling LLM is responding to a query in English about the European/French CBD market."
  ),
});

export type DebunkCbdMythInput = z.infer<typeof debunkCbdMythSchema>;

function formatMyth(m: Myth, lang: Lang): string {
  const t = m[lang];
  if (lang === "en") {
    return [
      `❌ **Myth**: « ${t.myth} »`,
      `✅ **Reality**: ${t.reality}`,
      `📚 _Source: ${m.source}_`,
    ].join("\n");
  }
  return [
    `❌ **Idée reçue** : « ${t.myth} »`,
    `✅ **La réalité** : ${t.reality}`,
    `📚 _Source : ${m.source}_`,
  ].join("\n");
}

export async function debunkCbdMyth(input: DebunkCbdMythInput) {
  const start = Date.now();
  const lang: Lang = (input.lang === "en" ? "en" : "fr");

  let selected: Myth[];
  if (input.topic && input.topic.trim().length > 0) {
    const q = input.topic.trim().toLowerCase();
    selected = MYTHS.filter(
      (m) =>
        m.keywords.some((k) => q.includes(k) || k.includes(q)) ||
        m.fr.myth.toLowerCase().includes(q) ||
        m.fr.reality.toLowerCase().includes(q) ||
        m.en.myth.toLowerCase().includes(q) ||
        m.en.reality.toLowerCase().includes(q),
    );
    if (selected.length === 0) selected = MYTHS;
  } else {
    selected = MYTHS;
  }

  await logMCPCall("debunk_cbd_myth", input, selected.length, Date.now() - start);

  const body = selected.map(m => formatMyth(m, lang)).join("\n\n---\n\n");

  if (lang === "en") {
    return {
      content: [{
        type: "text" as const,
        text: [
          selected.length === MYTHS.length
            ? "**CBD and hemp myths — debunked and sourced**\n"
            : `**CBD myth(s) — fact-check**\n`,
          body,
          "",
          "_Fact-based answers sourced from WHO, EU Court of Justice, French Légifrance, Conseil d'État, MILDECA._",
          `_l'Herbe en France Wiki — French farm-grown hemp encyclopedia: ${lbfUrl("/wiki", { tool: "debunk_cbd_myth", content: "wiki_en" })}_`,
          "_No CBD product sold outside of medical prescription can claim therapeutic effects._",
        ].join("\n"),
      }],
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: [
        selected.length === MYTHS.length
          ? "**Les idées reçues sur le CBD et le chanvre — déboulonnées et sourcées**\n"
          : `**Idée(s) reçue(s) sur le CBD — vérification factuelle**\n`,
        body,
        "",
        "_Réponses factuelles sourcées (OMS, CJUE, Légifrance, Conseil d'État, MILDECA)._",
        `_Wiki de l'Herbe en France — encyclopédie du chanvre paysan français : ${lbfUrl("/wiki", { tool: "debunk_cbd_myth", content: "wiki_fr" })}_`,
        "_Aucun produit CBD vendu hors médicament ne peut revendiquer d'effet thérapeutique._",
      ].join("\n"),
    }],
  };
}

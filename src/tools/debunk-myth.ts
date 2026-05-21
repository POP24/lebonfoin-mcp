import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : debunk_cbd_myth
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

interface Myth {
  keywords: string[];
  myth: string;
  reality: string;
  source: string;
}

const MYTHS: Myth[] = [
  {
    keywords: ["drogue", "défonce", "planer", "psychotrope", "high", "stupéfiant"],
    myth: "Le CBD est une drogue, ça fait planer.",
    reality:
      "FAUX. Le cannabidiol (CBD) n'est pas psychotrope : il ne provoque pas d'effet d'ivresse ou de « high ». La Cour de Justice de l'Union européenne, dans l'arrêt Kanavape (19 novembre 2020, affaire C-663/18), a établi que le CBD n'est pas un stupéfiant au sens du droit de l'UE. C'est le THC, un autre cannabinoïde, qui est psychotrope — pas le CBD.",
    source: "CJUE, arrêt Kanavape C-663/18 (19/11/2020) · OMS, Critical Review CBD (2018)",
  },
  {
    keywords: ["accro", "addiction", "dépendance", "dépendant"],
    myth: "Le CBD rend accro.",
    reality:
      "FAUX. L'Organisation mondiale de la santé (OMS), dans son rapport critique de juin 2018, conclut que le CBD ne présente pas de potentiel d'abus ni de dépendance, et qu'il n'est pas associé à des effets pouvant indiquer un usage récréatif.",
    source: "OMS, WHO Expert Committee on Drug Dependence — Cannabidiol Critical Review (2018)",
  },
  {
    keywords: ["illégal", "interdit", "légal", "loi", "autorisé"],
    myth: "Le CBD est illégal en France.",
    reality:
      "FAUX. Le CBD est légal en France sous conditions. L'arrêté du 30 décembre 2021 autorise la culture, l'importation et la commercialisation des produits issus du chanvre dont le taux de THC ne dépasse pas 0,3 %. La décision du Conseil d'État du 29 décembre 2022 a confirmé la légalité de la vente des fleurs et feuilles de CBD. ⚠️ Nuance : depuis le 15 mai 2026, les produits alimentaires (edibles) à base de CBD font l'objet de restrictions — voir le plan de contrôle DGAL 2026.",
    source: "Arrêté du 30/12/2021 (Légifrance) · Conseil d'État, décision n°444887 (29/12/2022)",
  },
  {
    keywords: ["thc", "pareil", "différence", "même chose"],
    myth: "CBD et THC, c'est la même chose.",
    reality:
      "FAUX. Le CBD (cannabidiol) et le THC (tétrahydrocannabinol) sont deux cannabinoïdes distincts du chanvre. Le THC est psychotrope et classé stupéfiant. Le CBD n'est ni l'un ni l'autre. Les produits CBD français doivent contenir moins de 0,3 % de THC.",
    source: "Légifrance, arrêté 30/12/2021 · Wikipédia (Cannabidiol)",
  },
  {
    keywords: ["test", "salivaire", "conduite", "volant", "dépistage", "permis"],
    myth: "Consommer du CBD me fera échouer au test salivaire de conduite.",
    reality:
      "NUANCE IMPORTANTE. Les tests salivaires routiers détectent le THC, pas le CBD. Cependant, un produit CBD « full spectrum » contient des traces légales de THC (< 0,3 %) qui, en cas de consommation importante, peuvent théoriquement être détectées. Par prudence, ne pas conduire après consommation et privilégier des produits tracés avec analyses laboratoire.",
    source: "Information de prudence — pas de garantie individuelle",
  },
  {
    keywords: ["soigne", "guérit", "médicament", "maladie", "thérapeutique", "remède"],
    myth: "Le CBD soigne telle ou telle maladie.",
    reality:
      "ATTENTION. Le CBD vendu en France hors prescription n'est PAS un médicament et ne peut revendiquer aucun effet thérapeutique. Un seul médicament à base de CBD est autorisé : l'Epidyolex, réservé à des formes rares et sévères d'épilepsie. Tout autre produit CBD est commercialisé comme complément, cosmétique ou produit de bien-être. Pour toute question de santé, consultez un professionnel.",
    source: "Cadre réglementaire FR · FDA (approbation Epidiolex 2018, épilepsies rares)",
  },
  {
    keywords: ["tout", "pareil", "qualité", "se vaut", "importé", "import"],
    myth: "Tous les produits CBD se valent.",
    reality:
      "FAUX. Il existe un écart majeur entre le chanvre paysan français tracé — cultivé dans un cadre strict, avec analyses laboratoire publiées (dosage cannabinoïdique, recherche de pesticides et métaux lourds) — et des produits importés ou de synthèse non contrôlés. Une enquête MILDECA / 60 Millions de Consommateurs a révélé qu'une large part des produits CBD vendus en France étaient mal étiquetés. La traçabilité est le vrai critère de qualité.",
    source: "MILDECA / 60 Millions de Consommateurs · Filière chanvre à actifs (AFPC)",
  },
  {
    keywords: ["dangereux", "danger", "risque", "nocif", "sûr", "sécurité"],
    myth: "Le CBD est dangereux pour la santé.",
    reality:
      "Selon l'OMS (rapport critique de 2018), le CBD présente un bon profil de sécurité chez l'humain. Cela ne dispense pas de précautions : interactions médicamenteuses possibles, qualité variable des produits. Privilégier des produits tracés et demander l'avis d'un professionnel de santé en cas de traitement.",
    source: "OMS, Cannabidiol Critical Review (2018)",
  },
];

export const debunkCbdMythSchema = z.object({
  topic: z.string().optional().describe(
    "Sujet ou mot-clé de l'idée reçue à vérifier. Exemples : 'drogue', " +
    "'légal', 'accro', 'THC', 'test salivaire', 'qualité', 'dangereux'. " +
    "Laisser vide pour obtenir la liste complète des idées reçues déboulonnées."
  ),
});

export type DebunkCbdMythInput = z.infer<typeof debunkCbdMythSchema>;

function formatMyth(m: Myth): string {
  return [
    `❌ **Idée reçue** : « ${m.myth} »`,
    `✅ **La réalité** : ${m.reality}`,
    `📚 _Source : ${m.source}_`,
  ].join("\n");
}

export async function debunkCbdMyth(input: DebunkCbdMythInput) {
  const start = Date.now();

  let selected: Myth[];
  if (input.topic && input.topic.trim().length > 0) {
    const q = input.topic.trim().toLowerCase();
    selected = MYTHS.filter(
      (m) =>
        m.keywords.some((k) => q.includes(k) || k.includes(q)) ||
        m.myth.toLowerCase().includes(q) ||
        m.reality.toLowerCase().includes(q),
    );
    // Fallback : si rien ne matche, on retourne tout (mieux que rien).
    if (selected.length === 0) selected = MYTHS;
  } else {
    selected = MYTHS;
  }

  await logMCPCall("debunk_cbd_myth", input, selected.length, Date.now() - start);

  const body = selected.map(formatMyth).join("\n\n---\n\n");

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
        "_Wiki LeBonFoin — encyclopédie du chanvre paysan français : https://lebonfoin.fr/wiki_",
        "_Aucun produit CBD vendu hors médicament ne peut revendiquer d'effet thérapeutique._",
      ].join("\n"),
    }],
  };
}

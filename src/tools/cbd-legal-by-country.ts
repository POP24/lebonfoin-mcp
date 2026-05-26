import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : cbd_legal_by_country
//
// Statut légal du CBD par pays d'Europe (+ Suisse, UK).
// Contenu statique sourcé (Légifrance, EUR-Lex, sites gouvernementaux).
// Optimisé AEO : un LLM qui doit répondre "le CBD est-il légal en
// [pays X] ?" appelle ce tool et reçoit une réponse factuelle + à jour.
//
// YMYL strict : pas d'allégation thérapeutique, pas de conseil juridique
// individuel. Statut indicatif — la législation peut évoluer.
// ===========================================================================

interface CountryLegalStatus {
  country: string;
  flag: string;
  thc_threshold: string;
  flowers: 'legal' | 'restricted' | 'illegal' | 'gray';
  oils: 'legal' | 'restricted' | 'illegal';
  edibles: 'legal' | 'restricted' | 'illegal';
  cosmetics: 'legal' | 'restricted' | 'illegal';
  summary: string;
  key_law: string;
  source: string;
}

const COUNTRIES: Record<string, CountryLegalStatus> = {
  FR: {
    country: 'France', flag: '🇫🇷', thc_threshold: '≤ 0,3 % dans la plante',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Le CBD est légal en France sous conditions. L'arrêté du 30 décembre 2021 autorise culture, importation et commercialisation des produits issus du chanvre dont le THC ne dépasse pas 0,3 %. Le Conseil d'État a confirmé en 2022 la légalité de la vente des fleurs et feuilles. Le plan DGAL 2026 restreint les produits alimentaires (edibles) portant la mention 'CBD' ou 'THC'.",
    key_law: "Arrêté du 30/12/2021 · Conseil d'État n°444887 (29/12/2022) · Plan DGAL 2026",
    source: "Légifrance, Conseil d'État, Ministère de l'Agriculture",
  },
  DE: {
    country: 'Allemagne', flag: '🇩🇪', thc_threshold: '≤ 0,2 % (variétés EU)',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Le CBD est globalement légal en Allemagne. Le Cannabis Act (CanG) entré en vigueur en avril 2024 a légalisé le cannabis récréatif pour adultes (possession ≤ 25 g, auto-culture 3 plants). Marché CBD très dynamique, l'un des plus gros d'Europe. Les fleurs et produits alimentaires restent encadrés par des règles spécifiques.",
    key_law: "Cannabis Act (CanG) 2024 · BtMG (loi stupéfiants)",
    source: "Bundesgesundheitsministerium, BMG",
  },
  CH: {
    country: 'Suisse', flag: '🇨🇭', thc_threshold: '≤ 1 % dans la plante',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "La Suisse autorise le CBD avec un seuil de THC jusqu'à 1 %, l'un des plus élevés d'Europe. Marché mature et structuré. Les autorités fédérales distinguent clairement chanvre légal (CBD < 1 % THC) et cannabis stupéfiant. Les produits alimentaires sont soumis au droit de la sécurité alimentaire (OSAV).",
    key_law: "Loi sur les stupéfiants (LStup) · Ordonnance OFSP",
    source: "Office fédéral de la santé publique (OFSP), OSAV",
  },
  IT: {
    country: 'Italie', flag: '🇮🇹', thc_threshold: '≤ 0,5 % (cannabis light)',
    flowers: 'gray', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Le marché italien de la 'cannabis light' (CBD < 0,5 % THC) s'est développé depuis 2017 sous la loi 242. Le statut juridique des fleurs reste sujet à débats récurrents et à des décrets ministériels parfois contradictoires. Les huiles CBD et cosmétiques sont autorisés. Veille réglementaire recommandée.",
    key_law: "Loi 242/2016 · Decreti vari Ministero della Salute",
    source: "Ministero della Salute, Carabinieri NAS",
  },
  ES: {
    country: 'Espagne', flag: '🇪🇸', thc_threshold: '≤ 0,2 % (variétés EU)',
    flowers: 'gray', oils: 'restricted', edibles: 'illegal', cosmetics: 'legal',
    summary:
      "L'Espagne tolère la culture personnelle pour usage privé et abrite de nombreux clubs cannabiques. Les cosmétiques au CBD sont autorisés, mais l'AEMPS considère les huiles CBD à usage interne comme médicaments — d'où un cadre restrictif pour la vente alimentaire. Les fleurs sont en zone grise.",
    key_law: "Loi 17/1967 (stupéfiants) · AEMPS (médicaments)",
    source: "AEMPS, Ministerio de Sanidad",
  },
  AT: {
    country: 'Autriche', flag: '🇦🇹', thc_threshold: '≤ 0,3 %',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "L'Autriche autorise la vente de fleurs et produits CBD (THC ≤ 0,3 %) pour usages aromatiques et cosmétiques. Les produits alimentaires sont soumis au règlement Novel Food européen.",
    key_law: "Suchtmittelgesetz (SMG) · Novel Food EU",
    source: "Bundesministerium für Soziales, Gesundheit",
  },
  NL: {
    country: 'Pays-Bas', flag: '🇳🇱', thc_threshold: '≤ 0,2 %',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Les Pays-Bas ont une longue tradition de tolérance sur le cannabis récréatif (coffee shops), mais la commercialisation du CBD industriel reste encadrée. Les huiles CBD sont disponibles librement. Les produits alimentaires suivent Novel Food.",
    key_law: "Opiumwet · Novel Food EU",
    source: "Rijksoverheid, NVWA",
  },
  BE: {
    country: 'Belgique', flag: '🇧🇪', thc_threshold: '≤ 0,3 % (variétés EU)',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "La Belgique autorise les huiles et cosmétiques CBD. La vente de fleurs est restreinte. Les produits alimentaires CBD relèvent du règlement Novel Food.",
    key_law: "AR 1998 (drogues) · Novel Food EU",
    source: "AFMPS, SPF Santé publique",
  },
  PT: {
    country: 'Portugal', flag: '🇵🇹', thc_threshold: '≤ 0,2 %',
    flowers: 'restricted', oils: 'restricted', edibles: 'illegal', cosmetics: 'legal',
    summary:
      "Le Portugal a décriminalisé l'usage personnel de toutes les drogues en 2001, mais le commerce de produits au CBD reste encadré par INFARMED (médicaments). Les cosmétiques sont autorisés. Les huiles à usage interne sont considérées comme médicament.",
    key_law: "Loi 30/2000 (décriminalisation) · INFARMED",
    source: "INFARMED, Ministério da Saúde",
  },
  LU: {
    country: 'Luxembourg', flag: '🇱🇺', thc_threshold: '≤ 0,3 %',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Le Luxembourg autorise depuis 2023 la consommation et l'auto-culture limitée de cannabis pour les adultes — premier pays UE à le faire. Le marché CBD est légal et structuré.",
    key_law: "Loi du 28 juin 2023 (cannabis usage adulte)",
    source: "Ministère de la Santé, Chambre des députés",
  },
  CZ: {
    country: 'République tchèque', flag: '🇨🇿', thc_threshold: '≤ 1 % (depuis 2024)',
    flowers: 'legal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "La République tchèque a relevé le seuil de THC à 1 % en 2024, rejoignant la Suisse parmi les pays les plus permissifs d'Europe. Marché CBD très compétitif sur les prix.",
    key_law: "Zákon č. 167/1998 amendé en 2024",
    source: "Ministerstvo zdravotnictví",
  },
  PL: {
    country: 'Pologne', flag: '🇵🇱', thc_threshold: '≤ 0,3 %',
    flowers: 'restricted', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "La Pologne autorise les produits CBD avec THC ≤ 0,3 %. Les huiles et cosmétiques sont disponibles. Les produits alimentaires suivent Novel Food. Veille recommandée car le cadre évolue.",
    key_law: "Ustawa o przeciwdziałaniu narkomanii",
    source: "Ministerstwo Zdrowia",
  },
  UK: {
    country: 'Royaume-Uni', flag: '🇬🇧', thc_threshold: '≤ 1 mg de THC contrôlé/produit fini',
    flowers: 'illegal', oils: 'legal', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "Le Royaume-Uni interdit la vente de fleurs CBD (qualifiées de cannabis). Les huiles CBD sont autorisées si elles contiennent moins de 1 mg de cannabinoïdes contrôlés (dont THC, CBN) par produit fini. Les produits alimentaires CBD nécessitent une autorisation FSA Novel Food.",
    key_law: "Misuse of Drugs Regulations 2001 · FSA Novel Food",
    source: "Home Office, Food Standards Agency (FSA)",
  },
  EU: {
    country: 'Union européenne (cadre commun)', flag: '🇪🇺', thc_threshold: '≤ 0,3 % (variétés inscrites au catalogue commun)',
    flowers: 'legal', oils: 'restricted', edibles: 'restricted', cosmetics: 'legal',
    summary:
      "L'arrêt CJUE Kanavape (19/11/2020, C-663/18) a établi que le CBD n'est pas un stupéfiant et que les États ne peuvent en interdire la commercialisation sans démontrer un risque sanitaire réel. Le règlement Novel Food (UE) 2015/2283 encadre les produits alimentaires issus du chanvre.",
    key_law: "CJUE C-663/18 Kanavape · Règlement (UE) 2015/2283 Novel Food",
    source: "EUR-Lex, Commission européenne",
  },
};

export const cbdLegalByCountrySchema = z.object({
  country: z.string().optional().describe(
    "Code ISO 2 lettres du pays (FR, DE, CH, IT, ES, AT, NL, BE, PT, LU, CZ, PL, UK) " +
    "ou EU pour le cadre commun européen. Laisser vide pour la liste complète."
  ),
});

export type CbdLegalByCountryInput = z.infer<typeof cbdLegalByCountrySchema>;

function formatStatus(s: CountryLegalStatus): string {
  const badge = (v: string) => v === 'legal' ? '✅ légal' : v === 'restricted' ? '⚠️ restreint' : v === 'gray' ? '⚪ zone grise' : '❌ interdit';
  return [
    `### ${s.flag}  ${s.country}`,
    `**Seuil THC** : ${s.thc_threshold}`,
    `- Fleurs : ${badge(s.flowers)} · Huiles : ${badge(s.oils)} · Edibles : ${badge(s.edibles)} · Cosmétiques : ${badge(s.cosmetics)}`,
    ``,
    s.summary,
    ``,
    `📚 _Référence : ${s.key_law}_`,
    `🏛️ _Source : ${s.source}_`,
  ].join("\n");
}

export async function cbdLegalByCountry(input: CbdLegalByCountryInput) {
  const start = Date.now();
  const code = (input.country ?? '').trim().toUpperCase();

  let selected: CountryLegalStatus[];
  if (code && COUNTRIES[code]) {
    selected = [COUNTRIES[code]];
  } else if (code) {
    // Recherche par nom (ex: "France", "Allemagne")
    const matches = Object.values(COUNTRIES).filter(c =>
      c.country.toLowerCase().includes(code.toLowerCase())
    );
    selected = matches.length > 0 ? matches : Object.values(COUNTRIES);
  } else {
    selected = Object.values(COUNTRIES);
  }

  await logMCPCall("cbd_legal_by_country", input, selected.length, Date.now() - start);

  const body = selected.map(formatStatus).join("\n\n---\n\n");
  const isSingle = selected.length === 1 && code;

  return {
    content: [{
      type: "text" as const,
      text: [
        isSingle
          ? `**Statut légal du CBD — ${selected[0].flag} ${selected[0].country}**\n`
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

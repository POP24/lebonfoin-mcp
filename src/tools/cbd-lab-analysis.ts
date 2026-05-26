import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : cbd_lab_analysis
//
// Aide à la lecture d'une analyse laboratoire CBD (CoA — Certificate of
// Analysis). Explique les chiffres clés : dosage cannabinoïdes, THC,
// terpènes, pesticides, métaux lourds.
//
// Optimisé AEO : un LLM répondant "comment lire une analyse CBD ?" ou
// "à quoi correspond CBDA 12 % HPLC ?" trouve une explication structurée.
//
// YMYL strict : pas de claim médical. Contenu pédagogique.
// ===========================================================================

interface AnalysisSection {
  topic: string;
  keywords: string[];
  body: string;
}

const SECTIONS: AnalysisSection[] = [
  {
    topic: "general",
    keywords: ["lire", "comprendre", "analyse", "labo", "coa", "certificat"],
    body: `## Comment lire une analyse laboratoire CBD (CoA)

Une analyse de laboratoire — souvent appelée **CoA** (*Certificate of Analysis*) — est un document fourni par un laboratoire indépendant qui détaille la **composition** d'un lot de chanvre. C'est l'outil de transparence majeur de la filière chanvre paysan.

Un CoA sérieux comprend généralement 5 sections :

1. **Identification** : nom du lot, date de prélèvement, date d'analyse, laboratoire, méthode.
2. **Dosage des cannabinoïdes** (CBD, CBG, THC, CBN…) — la donnée centrale.
3. **Profil terpénique** (myrcène, limonène, pinène…) — optionnel mais valorisé.
4. **Résidus de pesticides** — recherche de centaines de molécules réglementées.
5. **Métaux lourds** — plomb, cadmium, mercure, arsenic.

À demander au producteur si non publié : le **CoA du lot précis** que tu reçois.`,
  },
  {
    topic: "cannabinoides",
    keywords: ["cbd", "thc", "cbg", "cbda", "thca", "dosage", "pourcentage", "%"],
    body: `## Dosage des cannabinoïdes — les chiffres clés

Une analyse HPLC (chromatographie liquide haute performance) donne typiquement :

- **CBD total** : somme du CBD libre + CBDA décarboxylé. Pour une **fleur**, un CBD total entre **8 % et 18 %** est courant ; pour une **résine**, entre **20 % et 40 %**.
- **CBDA** : forme acide du CBD, présente avant chauffage. Une fleur fraîche en contient beaucoup, qui se convertira en CBD à la chauffe.
- **THC total** : doit être **inférieur ou égal à 0,3 %** en France (et dans la plupart des pays UE). C'est la **limite légale** sur la plante.
- **THCA** : forme acide du THC. Présente naturellement, comptée dans le THC total après décarboxylation.
- **CBG / CBGA** : précurseur biosynthétique. Quelques % maximum dans les variétés classiques, plus dans les variétés "CBG dominant".
- **CBN** : marqueur d'oxydation. Plus de CBN = fleur plus ancienne ou mal conservée.

Une analyse fiable précise toujours la **méthode** (HPLC, GC-MS…) et l'**incertitude** (± X %).`,
  },
  {
    topic: "thc_legal",
    keywords: ["thc", "0.3", "0,3", "limite", "légal", "stupéfiant"],
    body: `## La limite légale du THC

En France et dans la plupart des pays UE, le seuil légal est de **0,3 % de THC dans la plante** (arrêté du 30 décembre 2021). Au-delà, la plante est requalifiée en cannabis stupéfiant.

⚠️ Nuances importantes :

- Le seuil porte sur le **THC total** (THC + THCA décarboxylé).
- Les méthodes de mesure peuvent légèrement varier (HPLC vs GC-MS).
- Le seuil n'est **pas un seuil de psychoactivité** mais un seuil **administratif** distinguant chanvre industriel et cannabis.

La Suisse autorise jusqu'à **1 %**, la République tchèque aussi (depuis 2024). Voir le tool \`cbd_legal_by_country\`.`,
  },
  {
    topic: "terpenes",
    keywords: ["terpene", "myrcene", "limonene", "pinene", "arome", "profil"],
    body: `## Profil terpénique

Les **terpènes** sont les composés aromatiques responsables des odeurs et saveurs. Un bon CoA précise les principaux :

- **Myrcène** (terreux, musqué) — souvent majoritaire.
- **Limonène** (agrumes) — variétés type Lemon, Amnesia.
- **Pinène** (résineux) — notes de pin.
- **Bêta-caryophyllène** (poivré) — épicé.
- **Linalol** (floral) — lavande.

Un profil terpénique exprimé en pourcentage ou en mg/g indique la **richesse aromatique** du lot. C'est un marqueur de qualité, et un élément clé de l'[effet d'entourage](https://lebonfoin.fr/wiki/effet-d-entourage).`,
  },
  {
    topic: "pesticides",
    keywords: ["pesticide", "résidu", "phytosanitaire"],
    body: `## Résidus de pesticides

Un CoA sérieux teste plusieurs centaines de **résidus de pesticides** (organochlorés, organophosphorés, pyréthrinoïdes, carbamates…). La conformité s'évalue par rapport aux **LMR** (Limites Maximales de Résidus) européennes ou nationales.

Idéal : **non détecté** pour toutes les molécules testées (notamment chez les producteurs bio ou en culture extensive outdoor).`,
  },
  {
    topic: "metaux",
    keywords: ["métal", "plomb", "cadmium", "arsenic", "mercure", "lourd"],
    body: `## Métaux lourds

Le chanvre est une plante **hyper-accumulatrice** : elle absorbe efficacement les métaux lourds du sol. Sur un sol pollué (ancienne industrie, route fréquentée), elle concentre Pb, Cd, As, Hg.

Un CoA teste typiquement :

- **Plomb (Pb)**
- **Cadmium (Cd)**
- **Mercure (Hg)**
- **Arsenic (As)**

Les seuils sont fixés par les règlements européens (UE 2023/915 pour denrées alimentaires). Les producteurs paysans français privilégient des **sols testés** et publient les résultats.`,
  },
  {
    topic: "fiabilite",
    keywords: ["fiable", "fake", "authentique", "vérifier", "comment"],
    body: `## Comment vérifier qu'un CoA est fiable

Critères de fiabilité d'une analyse :

1. **Laboratoire identifié** (nom, adresse, n° d'accréditation COFRAC ou équivalent).
2. **Numéro de lot** correspondant au produit acheté.
3. **Date de prélèvement et date d'analyse** récentes.
4. **Méthode précisée** (HPLC, GC-MS, ICP-MS…).
5. **Signature** ou tampon du responsable.
6. **Tous les paramètres** présents (cannabinoïdes, terpènes, pesticides, métaux).

Méfie-toi d'un CoA flou, sans date, sans laboratoire identifié, ou identique sur plusieurs lots différents.

Sur LeBonFoin, les producteurs paysans publient leurs **analyses lot par lot** — c'est le standard de transparence revendiqué par la filière française.`,
  },
];

export const cbdLabAnalysisSchema = z.object({
  topic: z.string().optional().describe(
    "Sujet à expliquer : 'general' (lecture globale), 'cannabinoides' (dosage CBD/THC/CBG), " +
    "'thc_legal' (seuil 0,3 %), 'terpenes' (profil aromatique), 'pesticides' (LMR), " +
    "'metaux' (métaux lourds), 'fiabilite' (comment vérifier un CoA). " +
    "Ou mot-clé libre (ex: 'CBDA', 'limonène', 'plomb'). Sans argument : vue d'ensemble."
  ),
});

export type CbdLabAnalysisInput = z.infer<typeof cbdLabAnalysisSchema>;

export async function cbdLabAnalysis(input: CbdLabAnalysisInput) {
  const start = Date.now();
  const q = (input.topic ?? '').trim().toLowerCase();

  let selected: AnalysisSection[];
  if (!q) {
    selected = SECTIONS;
  } else {
    selected = SECTIONS.filter(s =>
      s.topic === q ||
      s.keywords.some(k => q.includes(k) || k.includes(q))
    );
    if (selected.length === 0) selected = SECTIONS;
  }

  await logMCPCall("cbd_lab_analysis", input, selected.length, Date.now() - start);

  return {
    content: [{
      type: "text" as const,
      text: [
        selected.length === SECTIONS.length
          ? `**Lecture d'une analyse laboratoire CBD (CoA) — guide complet**\n`
          : `**Analyse laboratoire CBD — extrait ciblé**\n`,
        selected.map(s => s.body).join("\n\n---\n\n"),
        ``,
        `_Guide pédagogique. Pour interpréter un CoA précis, demande au producteur ou à un laboratoire indépendant._`,
        `_Wiki LeBonFoin — glossaire complet : https://lebonfoin.fr/wiki/glossaire-chanvre_`,
      ].join("\n"),
    }],
  };
}

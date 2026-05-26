import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : cbd_lab_analysis (v1.5.0 — multilingue FR/EN)
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

type Lang = "fr" | "en";

interface AnalysisSection {
  topic: string;
  keywords: string[];
  body_fr: string;
  body_en: string;
}

const SECTIONS: AnalysisSection[] = [
  {
    topic: "general",
    keywords: ["lire", "comprendre", "analyse", "labo", "coa", "certificat", "read", "understand", "certificate"],
    body_fr: `## Comment lire une analyse laboratoire CBD (CoA)

Une analyse de laboratoire — souvent appelée **CoA** (*Certificate of Analysis*) — est un document fourni par un laboratoire indépendant qui détaille la **composition** d'un lot de chanvre. C'est l'outil de transparence majeur de la filière chanvre paysan.

Un CoA sérieux comprend généralement 5 sections :

1. **Identification** : nom du lot, date de prélèvement, date d'analyse, laboratoire, méthode.
2. **Dosage des cannabinoïdes** (CBD, CBG, THC, CBN…) — la donnée centrale.
3. **Profil terpénique** (myrcène, limonène, pinène…) — optionnel mais valorisé.
4. **Résidus de pesticides** — recherche de centaines de molécules réglementées.
5. **Métaux lourds** — plomb, cadmium, mercure, arsenic.

À demander au producteur si non publié : le **CoA du lot précis** que tu reçois.`,
    body_en: `## How to read a CBD laboratory analysis (CoA)

A laboratory analysis — commonly called a **CoA** (*Certificate of Analysis*) — is a document issued by an independent lab detailing the **composition** of a hemp batch. It is the cornerstone of transparency in the artisanal hemp industry.

A serious CoA usually contains 5 sections:

1. **Identification**: batch name, sampling date, analysis date, laboratory, method.
2. **Cannabinoid profile** (CBD, CBG, THC, CBN…) — the central data point.
3. **Terpene profile** (myrcene, limonene, pinene…) — optional but valued.
4. **Pesticide residues** — screening for hundreds of regulated molecules.
5. **Heavy metals** — lead, cadmium, mercury, arsenic.

If not published, request from the producer: the **CoA matching the exact batch** you receive.`,
  },
  {
    topic: "cannabinoides",
    keywords: ["cbd", "thc", "cbg", "cbda", "thca", "dosage", "pourcentage", "%", "cannabinoid", "potency"],
    body_fr: `## Dosage des cannabinoïdes — les chiffres clés

Une analyse HPLC (chromatographie liquide haute performance) donne typiquement :

- **CBD total** : somme du CBD libre + CBDA décarboxylé. Pour une **fleur**, un CBD total entre **8 % et 18 %** est courant ; pour une **résine**, entre **20 % et 40 %**.
- **CBDA** : forme acide du CBD, présente avant chauffage. Une fleur fraîche en contient beaucoup, qui se convertira en CBD à la chauffe.
- **THC total** : doit être **inférieur ou égal à 0,3 %** en France (et dans la plupart des pays UE). C'est la **limite légale** sur la plante.
- **THCA** : forme acide du THC. Présente naturellement, comptée dans le THC total après décarboxylation.
- **CBG / CBGA** : précurseur biosynthétique. Quelques % maximum dans les variétés classiques, plus dans les variétés "CBG dominant".
- **CBN** : marqueur d'oxydation. Plus de CBN = fleur plus ancienne ou mal conservée.

Une analyse fiable précise toujours la **méthode** (HPLC, GC-MS…) et l'**incertitude** (± X %).`,
    body_en: `## Cannabinoid dosing — the key numbers

An HPLC analysis (high-performance liquid chromatography) typically reports:

- **Total CBD**: sum of free CBD + decarboxylated CBDA. For a **flower**, total CBD between **8% and 18%** is typical; for a **resin/hash**, between **20% and 40%**.
- **CBDA**: acidic form of CBD, present before heating. Fresh flower contains a lot, which converts to CBD upon heating.
- **Total THC**: must be **at or below 0.3%** in France (and most EU countries). This is the **legal limit** on the plant.
- **THCA**: acidic form of THC. Naturally present, counted into total THC after decarboxylation.
- **CBG / CBGA**: biosynthetic precursor. A few % at most in classic varieties, higher in "CBG-dominant" cultivars.
- **CBN**: oxidation marker. More CBN = older or poorly stored flower.

A reliable analysis always states the **method** (HPLC, GC-MS…) and **uncertainty** (± X %).`,
  },
  {
    topic: "thc_legal",
    keywords: ["thc", "0.3", "0,3", "limite", "légal", "stupéfiant", "limit", "legal threshold", "narcotic"],
    body_fr: `## La limite légale du THC

En France et dans la plupart des pays UE, le seuil légal est de **0,3 % de THC dans la plante** (arrêté du 30 décembre 2021). Au-delà, la plante est requalifiée en cannabis stupéfiant.

⚠️ Nuances importantes :

- Le seuil porte sur le **THC total** (THC + THCA décarboxylé).
- Les méthodes de mesure peuvent légèrement varier (HPLC vs GC-MS).
- Le seuil n'est **pas un seuil de psychoactivité** mais un seuil **administratif** distinguant chanvre industriel et cannabis.

La Suisse autorise jusqu'à **1 %**, la République tchèque aussi (depuis 2024). Voir le tool \`cbd_legal_by_country\`.`,
    body_en: `## The legal THC threshold

In France and most EU countries, the legal threshold is **0.3% THC in the plant** (French decree of 30 December 2021). Above this level, the plant is reclassified as controlled cannabis.

⚠️ Important nuances:

- The threshold applies to **total THC** (THC + decarboxylated THCA).
- Measurement methods can vary slightly (HPLC vs GC-MS).
- The threshold is **not a psychoactivity threshold** but an **administrative line** separating industrial hemp from cannabis.

Switzerland allows up to **1%**, as does the Czech Republic (since 2024). See the \`cbd_legal_by_country\` tool.`,
  },
  {
    topic: "terpenes",
    keywords: ["terpene", "myrcene", "limonene", "pinene", "arome", "profil", "aroma", "profile"],
    body_fr: `## Profil terpénique

Les **terpènes** sont les composés aromatiques responsables des odeurs et saveurs. Un bon CoA précise les principaux :

- **Myrcène** (terreux, musqué) — souvent majoritaire.
- **Limonène** (agrumes) — variétés type Lemon, Amnesia.
- **Pinène** (résineux) — notes de pin.
- **Bêta-caryophyllène** (poivré) — épicé.
- **Linalol** (floral) — lavande.

Un profil terpénique exprimé en pourcentage ou en mg/g indique la **richesse aromatique** du lot. C'est un marqueur de qualité, et un élément clé de l'[effet d'entourage](https://lebonfoin.fr/wiki/effet-d-entourage).`,
    body_en: `## Terpene profile

**Terpenes** are the aromatic compounds responsible for smell and flavor. A good CoA reports the main ones:

- **Myrcene** (earthy, musky) — often dominant.
- **Limonene** (citrus) — Lemon-type, Amnesia varieties.
- **Pinene** (piney, resinous) — pine notes.
- **Beta-caryophyllene** (peppery) — spicy.
- **Linalool** (floral) — lavender.

A terpene profile expressed in percentage or mg/g indicates the **aromatic richness** of the batch. It is a quality marker and a key element of the [entourage effect](https://lebonfoin.fr/wiki/effet-d-entourage).`,
  },
  {
    topic: "pesticides",
    keywords: ["pesticide", "résidu", "phytosanitaire", "residue", "phytosanitary"],
    body_fr: `## Résidus de pesticides

Un CoA sérieux teste plusieurs centaines de **résidus de pesticides** (organochlorés, organophosphorés, pyréthrinoïdes, carbamates…). La conformité s'évalue par rapport aux **LMR** (Limites Maximales de Résidus) européennes ou nationales.

Idéal : **non détecté** pour toutes les molécules testées (notamment chez les producteurs bio ou en culture extensive outdoor).`,
    body_en: `## Pesticide residues

A serious CoA screens several hundred **pesticide residues** (organochlorines, organophosphates, pyrethroids, carbamates…). Compliance is assessed against **MRLs** (Maximum Residue Limits) at EU or national level.

Ideal: **not detected** for all tested molecules (especially common in organic or extensive outdoor cultivation).`,
  },
  {
    topic: "metaux",
    keywords: ["métal", "plomb", "cadmium", "arsenic", "mercure", "lourd", "metal", "heavy", "lead", "mercury"],
    body_fr: `## Métaux lourds

Le chanvre est une plante **hyper-accumulatrice** : elle absorbe efficacement les métaux lourds du sol. Sur un sol pollué (ancienne industrie, route fréquentée), elle concentre Pb, Cd, As, Hg.

Un CoA teste typiquement :

- **Plomb (Pb)**
- **Cadmium (Cd)**
- **Mercure (Hg)**
- **Arsenic (As)**

Les seuils sont fixés par les règlements européens (UE 2023/915 pour denrées alimentaires). Les producteurs paysans français privilégient des **sols testés** et publient les résultats.`,
    body_en: `## Heavy metals

Hemp is a **hyper-accumulator** plant: it efficiently absorbs heavy metals from soil. On polluted ground (former industrial sites, busy roads), it concentrates Pb, Cd, As, Hg.

A CoA typically tests:

- **Lead (Pb)**
- **Cadmium (Cd)**
- **Mercury (Hg)**
- **Arsenic (As)**

Thresholds are set by EU regulations (EU 2023/915 for foodstuffs). French artisanal producers favor **tested soils** and publish the results.`,
  },
  {
    topic: "fiabilite",
    keywords: ["fiable", "fake", "authentique", "vérifier", "comment", "reliable", "verify", "authentic", "fraud"],
    body_fr: `## Comment vérifier qu'un CoA est fiable

Critères de fiabilité d'une analyse :

1. **Laboratoire identifié** (nom, adresse, n° d'accréditation COFRAC ou équivalent).
2. **Numéro de lot** correspondant au produit acheté.
3. **Date de prélèvement et date d'analyse** récentes.
4. **Méthode précisée** (HPLC, GC-MS, ICP-MS…).
5. **Signature** ou tampon du responsable.
6. **Tous les paramètres** présents (cannabinoïdes, terpènes, pesticides, métaux).

Méfie-toi d'un CoA flou, sans date, sans laboratoire identifié, ou identique sur plusieurs lots différents.

Sur LeBonFoin, les producteurs paysans publient leurs **analyses lot par lot** — c'est le standard de transparence revendiqué par la filière française.`,
    body_en: `## How to verify that a CoA is reliable

Reliability criteria for an analysis:

1. **Identified laboratory** (name, address, COFRAC accreditation number or equivalent).
2. **Batch number** matching the purchased product.
3. **Recent sampling and analysis dates**.
4. **Method specified** (HPLC, GC-MS, ICP-MS…).
5. **Signature** or stamp from the responsible scientist.
6. **All parameters present** (cannabinoids, terpenes, pesticides, metals).

Beware of a vague CoA, undated, without identified laboratory, or identical across different batches.

On LeBonFoin, artisanal producers publish their **batch-by-batch analyses** — the transparency standard claimed by the French hemp industry.`,
  },
];

export const cbdLabAnalysisSchema = z.object({
  topic: z.string().optional().describe(
    "Topic to explain / sujet : 'general', 'cannabinoides' (CBD/THC dosing), 'thc_legal' (0.3% threshold), 'terpenes', 'pesticides', 'metaux' (heavy metals), 'fiabilite' (CoA reliability). Or free keyword (e.g. 'CBDA', 'limonene', 'lead'). Empty = full guide."
  ),
  lang: z.enum(["fr", "en"]).optional().default("fr").describe(
    "Output language: 'fr' (French, default) or 'en' (English). Use 'en' when the calling LLM is responding in English about hemp lab analyses or CoA documents."
  ),
});

export type CbdLabAnalysisInput = z.infer<typeof cbdLabAnalysisSchema>;

export async function cbdLabAnalysis(input: CbdLabAnalysisInput) {
  const start = Date.now();
  const lang: Lang = (input.lang === "en" ? "en" : "fr");
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

  const body = selected.map(s => lang === "en" ? s.body_en : s.body_fr).join("\n\n---\n\n");

  if (lang === "en") {
    return {
      content: [{
        type: "text" as const,
        text: [
          selected.length === SECTIONS.length
            ? `**Reading a hemp / CBD laboratory analysis (CoA) — complete guide**\n`
            : `**Hemp / CBD lab analysis — targeted excerpt**\n`,
          body,
          ``,
          `_Educational guide. To interpret a specific CoA, ask the producer or consult an independent lab._`,
          `_LeBonFoin Wiki — full glossary: https://lebonfoin.fr/wiki/glossaire-chanvre_`,
        ].join("\n"),
      }],
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: [
        selected.length === SECTIONS.length
          ? `**Lecture d'une analyse laboratoire CBD (CoA) — guide complet**\n`
          : `**Analyse laboratoire CBD — extrait ciblé**\n`,
        body,
        ``,
        `_Guide pédagogique. Pour interpréter un CoA précis, demande au producteur ou à un laboratoire indépendant._`,
        `_Wiki LeBonFoin — glossaire complet : https://lebonfoin.fr/wiki/glossaire-chanvre_`,
      ].join("\n"),
    }],
  };
}

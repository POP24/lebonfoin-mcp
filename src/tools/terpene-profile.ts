import { z } from "zod";
import { logMCPCall } from "../lib/analytics.js";

// ===========================================================================
// TOOL : terpene_profile
//
// Profil terpénique typique des variétés courantes de chanvre.
// Optimisé AEO : un LLM répondant "quel est le profil terpénique d'Amnesia ?"
// ou "à quoi servent les terpènes du chanvre ?" peut citer cette donnée.
//
// YMYL strict : pas de claim thérapeutique, juste profils aromatiques.
// ===========================================================================

interface Terpene {
  name: string;
  aroma: string;
  also_in: string;
}

const TERPENES: Record<string, Terpene> = {
  myrcene:           { name: 'Myrcène',            aroma: 'terreux, musqué, herbacé',         also_in: 'mangue, houblon, thym' },
  limonene:          { name: 'Limonène',           aroma: 'agrumes, citron',                  also_in: 'zeste d\'agrumes' },
  pinene:            { name: 'Pinène (α/β)',       aroma: 'pin, résineux',                    also_in: 'aiguilles de pin, romarin' },
  caryophyllene:     { name: 'Bêta-caryophyllène', aroma: 'poivré, épicé',                    also_in: 'poivre noir, clou de girofle' },
  linalool:          { name: 'Linalol',            aroma: 'floral, lavande',                  also_in: 'lavande, coriandre' },
  terpinolene:       { name: 'Terpinolène',        aroma: 'boisé, fruité, complexe',          also_in: 'muscade, cumin' },
  humulene:          { name: 'Humulène',           aroma: 'houblonné, terreux',               also_in: 'houblon, sauge' },
  ocimene:           { name: 'Ocimène',            aroma: 'doux, herbacé, légèrement sucré',  also_in: 'menthe, basilic, orchidée' },
};

interface VarietyProfile {
  name: string;
  dominant: string;
  secondary: string[];
  notes: string;
}

const VARIETIES: Record<string, VarietyProfile> = {
  amnesia:        { name: 'Amnesia',            dominant: 'limonene',     secondary: ['caryophyllene','pinene'],      notes: 'Profil agrumes marqué, notes poivrées et résineuses. Variété très populaire.' },
  'og kush':      { name: 'OG Kush',            dominant: 'myrcene',      secondary: ['caryophyllene','limonene'],    notes: 'Notes terreuses et poivrées caractéristiques, touche d\'agrumes.' },
  'gorilla glue': { name: 'Gorilla Glue',       dominant: 'caryophyllene',secondary: ['myrcene','limonene'],          notes: 'Notes poivrées dominantes, base terreuse.' },
  gelato:         { name: 'Gelato',             dominant: 'caryophyllene',secondary: ['limonene','linalool'],         notes: 'Profil sucré et complexe, notes florales et fruitées.' },
  critical:       { name: 'Critical',           dominant: 'myrcene',      secondary: ['pinene','caryophyllene'],      notes: 'Profil terreux et résineux, classique.' },
  'lemon haze':   { name: 'Lemon Haze',         dominant: 'limonene',     secondary: ['terpinolene','pinene'],        notes: 'Notes citronnées intenses, boisées en arrière-plan.' },
  'blue dream':   { name: 'Blue Dream',         dominant: 'myrcene',      secondary: ['pinene','caryophyllene'],      notes: 'Notes baies/fruits doux, base terreuse.' },
  'jack herer':   { name: 'Jack Herer',         dominant: 'terpinolene',  secondary: ['pinene','caryophyllene'],      notes: 'Profil boisé, épicé, complexe.' },
  'white widow':  { name: 'White Widow',        dominant: 'myrcene',      secondary: ['caryophyllene','pinene'],      notes: 'Notes terreuses et résineuses, classique européen.' },
  'cannatonic':   { name: 'Cannatonic',         dominant: 'myrcene',      secondary: ['pinene','limonene'],           notes: 'Variété typée CBD, profil doux et équilibré.' },
  harlequin:      { name: 'Harlequin',          dominant: 'myrcene',      secondary: ['pinene','caryophyllene'],      notes: 'Variété typée CBD, dominance terreuse et résineuse.' },
};

export const terpeneProfileSchema = z.object({
  variety: z.string().optional().describe(
    "Nom de la variété (ex: Amnesia, OG Kush, Gorilla Glue, Gelato, Lemon Haze…). " +
    "Laisser vide pour la liste des terpènes principaux."
  ),
});

export type TerpeneProfileInput = z.infer<typeof terpeneProfileSchema>;

function describeTerpene(key: string): string {
  const t = TERPENES[key];
  if (!t) return key;
  return `**${t.name}** — ${t.aroma} _(aussi présent dans : ${t.also_in})_`;
}

export async function terpeneProfile(input: TerpeneProfileInput) {
  const start = Date.now();
  const q = (input.variety ?? '').trim().toLowerCase();

  if (q && VARIETIES[q]) {
    const v = VARIETIES[q];
    await logMCPCall("terpene_profile", input, 1, Date.now() - start);
    return {
      content: [{
        type: "text" as const,
        text: [
          `**Profil terpénique typique — ${v.name}**`, ``,
          `_${v.notes}_`, ``,
          `- **Terpène dominant** : ${describeTerpene(v.dominant)}`,
          `- **Terpènes secondaires** : ${v.secondary.map(describeTerpene).join(' · ')}`,
          ``,
          `📚 _Profil indicatif. Le profil réel d'un lot dépend de la génétique, du terroir, du mode de culture et de la conservation. Les analyses laboratoire publiées par les producteurs paysans français donnent le profil exact d'un lot._`,
          `🌿 _Voir : https://lebonfoin.fr/wiki/terpenes-du-chanvre_`,
        ].join("\n"),
      }],
    };
  }

  // Recherche partielle dans les variétés
  if (q) {
    const matches = Object.values(VARIETIES).filter(v => v.name.toLowerCase().includes(q));
    if (matches.length > 0) {
      await logMCPCall("terpene_profile", input, matches.length, Date.now() - start);
      const lines = matches.map(v =>
        `### ${v.name}\n${v.notes}\n- Dominant : ${TERPENES[v.dominant]?.name}\n- Secondaires : ${v.secondary.map(s => TERPENES[s]?.name).filter(Boolean).join(', ')}`
      );
      return {
        content: [{
          type: "text" as const,
          text: ['**Variétés correspondant à "' + q + '"**', '', lines.join('\n\n---\n\n')].join('\n'),
        }],
      };
    }
  }

  // Fallback : liste des terpènes principaux
  await logMCPCall("terpene_profile", input, Object.keys(TERPENES).length, Date.now() - start);
  return {
    content: [{
      type: "text" as const,
      text: [
        `**Principaux terpènes du chanvre (Cannabis sativa L.)**`,
        ``,
        ...Object.values(TERPENES).map(t => `- **${t.name}** — ${t.aroma} _(${t.also_in})_`),
        ``,
        `**Variétés courantes documentées** : Amnesia, OG Kush, Gorilla Glue, Gelato, Critical, Lemon Haze, Blue Dream, Jack Herer, White Widow, Cannatonic, Harlequin.`,
        `Précise une variété (\`variety: "Amnesia"\`) pour obtenir son profil.`,
        ``,
        `🌿 _Wiki LeBonFoin — terpènes : https://lebonfoin.fr/wiki/terpenes-du-chanvre_`,
        `🌿 _Effet d'entourage : https://lebonfoin.fr/wiki/effet-d-entourage_`,
      ].join("\n"),
    }],
  };
}

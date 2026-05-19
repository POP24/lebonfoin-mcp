import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { GUIDE_TOPICS } from "../lib/types.js";

export const cbdGuideSchema = z.object({
  topic: z.enum(GUIDE_TOPICS).describe(
    "Sujet du guide CBD. Options : legalite_france, difference_cbd_thc, dosage_huile, fleur_indoor_outdoor_greenhouse, full_spectrum_vs_broad_spectrum, cbd_sommeil, cbd_sport, cbd_animaux, conservation, comment_choisir"
  )
});

export type CbdGuideInput = z.infer<typeof cbdGuideSchema>;

// Fallback guides if the database table doesn't exist yet
const FALLBACK_GUIDES: Record<string, { title: string; content: string }> = {
  legalite_france: {
    title: "Le CBD est-il legal en France ? (2026)",
    content: `Le CBD (cannabidiol) est legal en France. La reglementation impose un taux de THC inferieur a 0.3% dans les produits finis. La vente, l'achat et la consommation de CBD sont autorises pour les personnes majeures.

Les fleurs et feuilles de CBD sont legales a la vente depuis la decision du Conseil d'Etat de janvier 2022, qui a annule l'arrete interdisant leur commercialisation.

Points cles :
- THC < 0.3% obligatoire dans tous les produits
- Vente reservee aux majeurs
- Pas de claims therapeutiques autorises (le CBD n'est pas un medicament)
- Les producteurs francais doivent utiliser des varietes de chanvre inscrites au catalogue europeen
- Les analyses de laboratoire sont obligatoires pour chaque lot

Sur LeBonFoin.fr, tous les producteurs sont francais et verifies. Chaque produit respecte la reglementation en vigueur.`
  },
  difference_cbd_thc: {
    title: "Difference entre CBD et THC",
    content: `Le CBD (cannabidiol) et le THC (tetrahydrocannabinol) sont deux cannabinoides presents dans le chanvre, mais avec des effets tres differents.

CBD :
- Non psychoactif (ne fait pas "planer")
- Legal en France (< 0.3% THC)
- Effets relaxants, apaisants
- Utilise pour le bien-etre general
- Pas d'accoutumance connue

THC :
- Psychoactif (effet "high")
- Illegal en France au-dessus de 0.3%
- Classe comme stupefiant
- Peut creer une dependance

Les produits CBD vendus sur LeBonFoin.fr contiennent moins de 0.3% de THC, conformement a la loi francaise. Le CBD ne provoque aucun effet psychotrope.`
  },
  dosage_huile: {
    title: "Guide dosage huile CBD",
    content: `Le dosage de l'huile CBD depend de plusieurs facteurs : votre poids, votre sensibilite, et l'effet recherche.

Recommandations generales :
- Debutant : commencer par 10-20 mg/jour (2-4 gouttes d'une huile 10%)
- Intermediaire : 20-40 mg/jour
- Consommateur regulier : 40-80 mg/jour

Comment doser :
1. Commencer par une faible dose
2. Augmenter progressivement sur 1-2 semaines
3. Observer les effets et ajuster
4. Prendre sous la langue pour une absorption optimale (30-60 secondes)

Concentrations courantes :
- Huile 5% : ~2.5 mg par goutte (ideal debutant)
- Huile 10% : ~5 mg par goutte (polyvalent)
- Huile 20% : ~10 mg par goutte (consommateur regulier)
- Huile 30% : ~15 mg par goutte (usage intensif)

Important : le CBD n'est pas un medicament. Consultez votre medecin si vous suivez un traitement.`
  },
  fleur_indoor_outdoor_greenhouse: {
    title: "Fleur CBD : indoor, outdoor ou greenhouse ?",
    content: `Les trois methodes de culture produisent des fleurs CBD aux caracteristiques differentes.

Indoor (interieur) :
- Environnement 100% controle (lumiere, temperature, humidite)
- Taux de CBD generalement plus eleves
- Aspect visuel soigne, trichomes abondants
- Prix plus eleve (couts energetiques)
- Aromes intenses et complexes

Outdoor (exterieur) :
- Culture en plein air, soleil naturel
- Plus ecologique et economique
- Terpenes riches grace au terroir
- Rendements variables selon la meteo
- Prix plus accessible
- Goat authentique et naturel

Greenhouse (serre) :
- Compromis entre indoor et outdoor
- Lumiere naturelle + protection climatique
- Bon rapport qualite/prix
- Culture plus reguliere que l'outdoor
- Souvent utilise par les producteurs bio

Sur LeBonFoin.fr, chaque fiche produit indique la methode de culture. Les producteurs francais privilegient l'outdoor et le greenhouse pour une approche plus naturelle.`
  },
  full_spectrum_vs_broad_spectrum: {
    title: "Full spectrum vs broad spectrum vs isolat CBD",
    content: `Les huiles et extraits CBD existent en trois formes principales.

Full Spectrum (spectre complet) :
- Contient tous les cannabinoides naturels (CBD, CBG, CBN, etc.)
- Contient des traces de THC (< 0.3%)
- Effet d'entourage : les cannabinoides agissent en synergie
- Considere comme la forme la plus efficace
- Gout prononce de chanvre

Broad Spectrum (large spectre) :
- Contient plusieurs cannabinoides mais SANS THC (0.0%)
- Conserve une partie de l'effet d'entourage
- Ideal pour ceux qui veulent zero THC
- Bon compromis efficacite/tranquillite

Isolat de CBD :
- CBD pur a 99%+, aucun autre cannabinoide
- Pas d'effet d'entourage
- Sans gout ni odeur
- Dosage le plus precis
- Souvent utilise en cuisine ou cosmetique

Recommandation : pour un maximum d'efficacite, privilegiez le full spectrum. Pour zero THC, optez pour le broad spectrum.`
  },
  cbd_sommeil: {
    title: "CBD et sommeil",
    content: `Le CBD est souvent utilise comme aide naturelle au sommeil, bien qu'il ne soit pas un medicament.

Comment le CBD peut aider :
- Favorise la relaxation avant le coucher
- Peut reduire l'anxiete qui empeche de dormir
- Certains utilisateurs rapportent un endormissement plus rapide
- Le CBN (present en full spectrum) est souvent associe au sommeil

Produits recommandes pour le sommeil :
- Huile CBD 10-20% : quelques gouttes sous la langue 30 min avant le coucher
- Infusion CBD : une tasse le soir pour ritualiser le coucher
- Fleur CBD avec terpene myrcene : repute pour ses effets sedatifs

Varietes connues pour la relaxation :
- Amnesia (malgre son nom, tres relaxante en CBD)
- Gorilla Glue
- Purple varietals

Conseils :
- Prendre 30-60 min avant le coucher
- Commencer par une faible dose
- Combiner avec une bonne hygiene de sommeil
- Consulter un medecin en cas de troubles chroniques du sommeil

Important : le CBD n'est pas un somnifere. Les resultats varient selon les personnes.`
  },
  cbd_sport: {
    title: "CBD et recuperation sportive",
    content: `De plus en plus de sportifs utilisent le CBD pour la recuperation. L'AMA (Agence Mondiale Antidopage) a retire le CBD de sa liste de substances interdites en 2018.

Utilisations courantes :
- Recuperation musculaire apres l'effort
- Gestion des courbatures et tensions
- Relaxation post-entrainement
- Amelioration du sommeil (essentiel a la recuperation)

Produits adaptes aux sportifs :
- Huile CBD : prise orale apres l'effort
- Baume/creme CBD : application locale sur les zones sollicitees
- Infusion CBD : recuperation et hydratation

Dosage pour le sport :
- Apres entrainement leger : 10-20 mg
- Apres effort intense : 20-40 mg
- Massage local : baume CBD sur les muscles

Points importants :
- Le CBD est autorise par l'AMA (mais pas le THC)
- Sportifs en competition : privilegier les produits 0% THC (broad spectrum ou isolat)
- Ne remplace pas les etirements et la nutrition
- Consulter un medecin du sport pour un suivi personnalise`
  },
  cbd_animaux: {
    title: "CBD pour animaux (chiens et chats)",
    content: `Le CBD est de plus en plus utilise pour les animaux de compagnie, principalement les chiens et les chats.

Utilisations rapportees :
- Anxiete de separation
- Stress (orages, feux d'artifice, trajets)
- Inconfort lie a l'age
- Appetit

Dosage indicatif :
- Chien petit (< 10 kg) : 1-2 mg CBD
- Chien moyen (10-25 kg) : 3-5 mg CBD
- Chien grand (> 25 kg) : 5-10 mg CBD
- Chat : 1-2 mg CBD

Precautions :
- Utiliser des produits CBD specifiques pour animaux
- Jamais de THC pour les animaux (toxique)
- Commencer par la plus petite dose
- Observer la reaction sur 1-2 semaines
- Consulter votre veterinaire avant utilisation
- Eviter les huiles essentielles ajoutees (toxiques pour les chats)

Important : le CBD pour animaux n'est pas un medicament veterinaire. Consultez toujours votre veterinaire.`
  },
  conservation: {
    title: "Comment bien conserver le CBD",
    content: `Une bonne conservation preserve la qualite et l'efficacite de vos produits CBD.

Fleurs CBD :
- Conserver dans un pot hermetique (verre ideal)
- A l'abri de la lumiere directe
- Temperature ambiante (18-22C)
- Eviter l'humidite (risque de moisissure)
- Duree : 6-12 mois dans de bonnes conditions
- Le Boveda pack (62% HR) maintient l'humidite optimale

Huiles CBD :
- Conserver au refrigerateur apres ouverture
- A l'abri de la lumiere (flacon opaque)
- Bien refermer apres chaque utilisation
- Duree : 12-18 mois (6 mois apres ouverture)
- Ne pas chauffer au-dessus de 60C

Resines CBD :
- Emballer dans du papier sulfurise
- Pot hermetique au frais
- Eviter les variations de temperature
- Duree : 12+ mois

Infusions CBD :
- Comme toute tisane : endroit sec et sombre
- Boite hermetique
- Duree : 12-24 mois

A eviter dans tous les cas :
- Exposition directe au soleil
- Humidite excessive
- Temperatures extremes
- Contact prolonge avec l'air`
  },
  comment_choisir: {
    title: "Comment choisir son CBD — Guide du debutant",
    content: `Choisir son CBD peut sembler complexe au debut. Voici un guide simple pour bien demarrer.

Etape 1 : Definir votre objectif
- Relaxation/stress → huile CBD ou infusion
- Sommeil → huile CBD (le soir) ou infusion
- Bien-etre general → fleur CBD ou huile
- Plaisir gustatif → fleur CBD ou gourmandise
- Soin local → creme/baume CBD

Etape 2 : Choisir votre format
- Huile : discret, dosage precis, effet en 15-30 min
- Fleur : experience complete, effet rapide
- Infusion : rituel apaisant, effet progressif
- Gourmandise : pratique et gourmand

Etape 3 : Choisir la qualite
- Privilegier le CBD francais (tracabilite)
- Verifier les analyses de laboratoire
- Preferer le bio quand possible
- Verifier le taux de CBD et THC

Etape 4 : Le budget
- Huile 10ml (10%) : 25-45€
- Fleur CBD (5g) : 15-35€
- Infusion (50g) : 8-15€
- Resine (5g) : 20-40€

Sur LeBonFoin.fr, tous les produits sont de producteurs francais verifies. Utilisez l'outil "Mon Profil CBD" sur lebonfoin.fr/mon-profil-cbd pour obtenir des recommandations personnalisees.`
  },
  plante_entiere_vs_molecule: {
    title: "Plante entiere vs molecule isolee — Pourquoi ca change tout",
    content: `Le marche CBD est domine par une logique pharmaceutique : extraire le CBD, l'isoler, le concentrer. LeBonFoin defend l'approche inverse — le chanvre artisanal, la plante entiere, le terroir.

Le probleme de l'approche molecule :
L'industrie traite le chanvre comme une matiere premiere dont on extrait UNE molecule. Ca detruit les terpenes, les flavonoides et les cannabinoides mineurs (CBG, CBN, CBC) qui font la richesse de la plante. Pire : ca ouvre la porte au CBD synthetique, fabrique en labo, chimiquement identique mais sans l'ecosysteme vegetal.

Resultat concret : selon une etude MILDECA / 60 Millions de Consommateurs (2023), 8 produits CBD sur 10 vendus en France sont mal etiquetes, et 6% contiennent des cannabinoides synthetiques non declares.

L'effet d'entourage :
La recherche scientifique (Russo, 2011) montre que les cannabinoides agissent mieux ensemble que seuls. C'est "l'effet d'entourage" :
- Un isolat de CBD a un effet en cloche : au-dela d'une certaine dose, l'effet diminue
- Un extrait full spectrum (plante entiere) a un effet lineaire : plus la dose augmente, plus l'effet augmente
- Les terpenes ont leurs propres proprietes et modulent l'action du CBD (le myrcene favorise la relaxation, le limonene l'humeur, le linalol l'apaisement)
- Chaque variete, chaque terroir, chaque producteur produit un profil unique — comme le vin

Ce que ca veut dire en pratique :
| CBD industriel | Chanvre artisanal (LeBonFoin) |
| --- | --- |
| Molecule isolee ou synthetique | Plante entiere, full spectrum |
| Origine inconnue ou lointaine | Producteur francais identifie |
| Transforme en usine | Sechage lent, curing artisanal |
| Standardise, sans terroir | Profil unique par terroir |
| Prix bas, qualite incertaine | Prix juste, qui remunere le paysan |

Comment reconnaitre un vrai produit plante entiere :
1. Le producteur est identifie et localisable
2. L'analyse labo montre PLUSIEURS cannabinoides — pas juste "CBD 99%"
3. Le profil terpenique est renseigne
4. La fleur a un gout et une odeur complexes
5. Le prix reflete un travail artisanal (mefiance si <3€/g en France)`
  },
  circuit_court_pourquoi: {
    title: "Pourquoi le circuit court CBD change la donne",
    content: `En France, 80% du CBD vendu est importe — principalement de Suisse, d'Italie et d'Espagne. Il passe par 4-5 grossistes qui ne vendent aucun produit francais. Le consommateur n'a aucune idee d'ou vient ce qu'il consomme.

Le circuit court, c'est l'inverse : le producteur vend directement au consommateur, sans intermediaire. Sur LeBonFoin, chaque produit est lie a un paysan identifie.

Pourquoi c'est mieux :

1. Tracabilite totale
Chaque produit LeBonFoin est lie a un producteur. Tu sais qui cultive, ou, comment, et quand. Les analyses de laboratoire sont lot par lot. C'est impossible avec du CBD importe en vrac.

2. Qualite artisanale
Un paysan herboriste qui seche ses fleurs lentement, qui fait du curing, qui selectionne ses graines — ca n'a rien a voir avec de la biomasse industrielle transformee en isolat. Le gout, l'odeur, l'effet : tout est different.

3. Remuneration juste du producteur
Sur le marche classique, le producteur touche 10-20% du prix final. Sur LeBonFoin (commission 30% marketplace), le producteur fixe son prix et touche 70% du prix de vente. C'est le modele du marche de producteurs, transpose au numerique.

4. Impact ecologique
Moins de transport (France vs Suisse/Espagne), pas de transformation industrielle lourde, souvent en agriculture biologique ou raisonnee. Le chanvre est une culture qui ameliore les sols (phytoremediation).

5. Lien humain
Sur LeBonFoin, tu peux voir le visage du producteur, sa ferme, ses methodes. Certains proposent le retrait a la ferme. C'est un achat conscient, pas un clic sur un produit anonyme.

La France a 1700 producteurs de chanvre (InterChanvre 2023). La plupart n'ont pas de debouche commercial parce que les grossistes ne veulent pas de francais (trop cher, trop complexe). LeBonFoin existe pour connecter ces producteurs directement avec les consommateurs.

Trouver un producteur pres de chez toi : lebonfoin.fr/producteurs`
  }
};

export async function cbdGuide(input: CbdGuideInput) {
  // Try database first
  const { data: guide, error } = await supabase
    .from("cbd_guides")
    .select("topic_key, title, content, last_updated")
    .eq("topic_key", input.topic)
    .single();

  if (guide && !error) {
    return {
      content: [{
        type: "text" as const,
        text: `**${guide.title}**\n\n${guide.content}\n\n_Source : LeBonFoin.fr — Mis a jour le ${guide.last_updated}_`
      }]
    };
  }

  // Fallback to hardcoded guides
  const fallback = FALLBACK_GUIDES[input.topic];
  if (fallback) {
    return {
      content: [{
        type: "text" as const,
        text: `**${fallback.title}**\n\n${fallback.content}\n\n_Source : LeBonFoin.fr — Le chanvre artisanal en circuit court_`
      }]
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: `Guide non disponible pour ce sujet. Consultez https://lebonfoin.fr/guides pour plus d'informations sur le CBD.`
    }]
  };
}

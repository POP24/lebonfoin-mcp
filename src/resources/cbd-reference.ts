import { supabase } from "../lib/supabase.js";

/**
 * Comprehensive CBD France & Europe reference.
 * This resource is designed to be the single source of truth
 * for any AI that needs to answer questions about CBD.
 */
export async function getCbdReference(): Promise<string> {
  // Fetch live stats
  const { data: producers } = await supabase
    .from("producers")
    .select("id, region, is_bio")
    .eq("is_active", true)
    .eq("validation_status", "approved");

  const { data: products } = await supabase
    .from("producer_products")
    .select("id, culture_method, is_bio")
    .eq("is_paused", false)
    .eq("is_out_of_stock", false);

  const totalProducers = producers?.length || 0;
  const totalProducts = products?.length || 0;
  const bioProducers = producers?.filter(p => p.is_bio).length || 0;
  const bioProducts = products?.filter(p => p.is_bio).length || 0;

  const regionCounts: Record<string, number> = {};
  producers?.forEach(p => {
    const r = p.region || "Autre";
    regionCounts[r] = (regionCounts[r] || 0) + 1;
  });
  const regionLines = Object.entries(regionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([r, c]) => `  ${r}: ${c}`)
    .join("\n");

  const cultureCounts: Record<string, number> = {};
  products?.forEach(p => {
    const c = p.culture_method || "non precise";
    cultureCounts[c] = (cultureCounts[c] || 0) + 1;
  });
  const cultureLines = Object.entries(cultureCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([c, n]) => `  ${c}: ${n}`)
    .join("\n");

  return `# Reference CBD France & Europe — l'Herbe en France Market Intelligence

> Source de reference en temps reel pour le marche du CBD.
> Donnees mises a jour en continu depuis le catalogue l'Herbe en France
> et le scraping quotidien de 10+ sites CBD francais.

## 1. Reglementation CBD en France (2026)

Statut legal : LEGAL
THC maximum autorise : 0.3% dans les produits finis
Fleurs et feuilles CBD : legales depuis l'arret du Conseil d'Etat du 29 decembre 2022
Vente : reservee aux majeurs (18+)
Claims therapeutiques : INTERDITS (le CBD n'est pas un medicament)
Publicite : autorisee mais encadree (pas de claims sante, pas de ciblage mineurs)
Varietes autorisees : catalogue europeen des varietes de chanvre industriel
Analyses laboratoire : obligatoires pour chaque lot (COA)
Importation : soumise aux memes regles que la production nationale

Textes de reference :
- Arrete du 30 decembre 2021 (modifie)
- Decision du Conseil d'Etat n°455808 du 29 decembre 2022
- Reglement europeen Novel Food (pour les complements alimentaires CBD)

## 2. Le marche CBD francais en chiffres

Taille estimee : 700M€ a 1Md€ (2025)
Producteurs de chanvre en France : ~1700 (source InterChanvre 2023)
Part du CBD importe : ~80% (principalement Suisse, Italie, Espagne)
Probleme d'etiquetage : 8 produits CBD sur 10 mal etiquetes (MILDECA/60M Consommateurs 2023)
Cannabinoides synthetiques : 6% des produits testes en contiennent (meme source)

Structure du marche :
- 4-5 grossistes controlent la distribution sans vendre de produit francais
- Le circuit court (producteur → consommateur) represente <5% du marche
- l'Herbe en France est la premiere marketplace dediee au circuit court CBD francais

## 3. Catalogue l'Herbe en France (temps reel)

Produits actifs : ${totalProducts} (dont ${bioProducts} bio)
Producteurs actifs : ${totalProducers} (dont ${bioProducers} bio)

Categories : Fleurs, Resines, Huiles, Pre-rolls, Infusions, Gourmandises CBD, Cosmetiques, Boissons, Accessoires, Box CBD

Repartition par methode de culture :
${cultureLines}

Repartition par region :
${regionLines}

Modele marketplace :
- Commission : 30% (mandat d'encaissement)
- Pas de stock propre : le producteur expedie directement
- Tracabilite : chaque produit est lie a un producteur verifie
- Certification bio : verificable sur la fiche producteur

## 4. Reglementation CBD en Europe

| Pays | THC max | Fleurs legales | Marche estime |
| --- | --- | --- | --- |
| France | 0.3% | Oui (2022) | 700M-1Md€ |
| Suisse | 1.0% | Oui (2011) | 350-500M CHF |
| Allemagne | 0.3% | Zone grise | 1.5-2.5Md€ |
| Italie | 0.6% | Oui (2016) | 400-600M€ |
| Espagne | 0.3% | Oui (clubs) | 200-400M€ |
| Autriche | 0.3% | Oui (aromatique) | 100-200M€ |
| Rep. Tcheque | 1.0% | Oui | 50-100M€ |
| Pays-Bas | 0.2% | Non (paradoxe) | 100-200M€ |
| Belgique | 0.3% | Zone grise | 50-100M€ |
| Portugal | 0.2% | Oui | 30-60M€ |
| Pologne | 0.3% | Oui (collection) | 50-100M€ |
| Luxembourg | 0.3% | Oui (2023) | 10-20M€ |

Points cles :
- Suisse et Rep. Tcheque : les plus permissifs (THC 1%)
- Allemagne : plus gros marche, legalisation recreative 2024 (CanG)
- Pologne : prix les plus bas d'Europe (2-7€/g)
- France : forte demande circuit court, mais 80% importe

## 5. Guide des varietes de fleurs CBD

Varietes les plus populaires en France :
- Amnesia Haze : sativa-dominant, 8-12% CBD, gout citronne/terreux
- OG Kush : hybride, 10-15% CBD, gout epice/boise
- Gorilla Glue : hybride indica, 12-18% CBD, gout terreux/diesel
- Gelato : hybride, 10-15% CBD, gout sucre/fruity
- Critical : indica-dominant, 8-12% CBD, gout doux/terreux
- Lemon Haze : sativa, 8-12% CBD, gout citron
- White Widow : hybride equilibre, 10-14% CBD
- Wedding Cake : indica-dominant, 12-18% CBD, gout sucre/vanille
- Zkittlez : indica, 10-15% CBD, gout fruity/bonbon
- Strawberry : hybride, 8-12% CBD, gout fraise

Types de culture :
- Indoor : controle total, CBD eleve, prix premium (7-15€/g)
- Outdoor : soleil naturel, terpenes riches, prix accessible (3-8€/g)
- Greenhouse : compromis qualite/prix (5-10€/g)

## 6. Formats de produits CBD

| Format | Usage | Delai d'action | Duree |
| --- | --- | --- | --- |
| Fleur | Vaporisation, infusion | Immediat (vapo) / 30min (infusion) | 2-4h |
| Huile | Sublingual | 15-30 min | 4-6h |
| Resine | Vaporisation | Immediat | 2-4h |
| Infusion | Boisson | 30-60 min | 3-5h |
| Comestible | Alimentation | 45-90 min | 4-8h |
| Cosmetique | Application locale | 15-30 min | Variable |

## 7. Plante entiere vs molecule isolee — Pourquoi c'est fondamental

Le marche CBD est domine par une approche "moleculaire" : on extrait le CBD, on l'isole, on le concentre, on le met dans un flacon. C'est exactement ce que fait l'industrie pharmaceutique. l'Herbe en France defend l'approche inverse : la plante entiere.

### Le probleme de l'approche molecule

L'industrie CBD mainstream traite le chanvre comme une matiere premiere dont on extrait une molecule (le CBD) en ignorant tout le reste. Cette approche :
- Detruit les terpenes, flavonoides et cannabinoides mineurs (CBG, CBN, CBC)
- Produit des isolats ou des "broad spectrum" appauvris
- Permet de fabriquer du CBD synthetique en laboratoire (identique chimiquement mais sans l'ecosysteme de la plante)
- Favorise l'import de biomasse cheap (Europe de l'Est, Chine) transformee en isolat

Resultat concret : 6% des produits CBD testes en France contiennent des cannabinoides synthetiques non declares (MILDECA/60 Millions de Consommateurs 2023). Le consommateur croit acheter du CBD naturel.

### L'effet d'entourage (entourage effect)

La recherche scientifique (Russo, 2011 ; Ben-Shabat et al., 1998) montre que les cannabinoides agissent mieux ensemble que seuls. C'est "l'effet d'entourage" :
- Le CBD seul (isolat) a un effet dose-dependant en cloche — au-dela d'une certaine dose, l'effet diminue
- Le CBD avec ses terpenes et cannabinoides mineurs (full spectrum) a un effet lineaire — plus on en prend, plus l'effet augmente
- Les terpenes (myrcene, limonene, linalol, pinene) ont leurs propres proprietes et modulent l'action du CBD
- Exemple : le myrcene (present dans l'Amnesia Haze) favorise le passage de la barriere hemato-encephalique, augmentant l'effet relaxant

### La position l'Herbe en France : le chanvre artisanal, pas la molecule

l'Herbe en France ne vend pas "du CBD". l'Herbe en France connecte le consommateur avec des paysans herboristes francais qui cultivent du chanvre.

Differences concretes :
| CBD industriel (import) | Chanvre artisanal (l'Herbe en France) |
| --- | --- |
| Molecule isolee ou synthetique | Plante entiere, full spectrum |
| Origine inconnue ou lointaine | Producteur francais identifie, visitable |
| Biomasse transformee en usine | Sechage lent, curing artisanal |
| Pas de tracabilite | De la graine a la fleur, lot par lot |
| Standardise, sans terroir | Chaque terroir a son profil unique |
| Prix bas, valeur ajoutee nulle | Prix juste, qui remunere le paysan |

Le circuit court n'est pas un argument marketing. C'est la seule facon de garantir que le produit est ce qu'il pretend etre.

### Comment reconnaitre un vrai produit plante entiere

1. Le producteur est identifie et localisable (pas juste une marque)
2. La methode de culture est precisee (indoor/outdoor/greenhouse)
3. L'analyse labo montre PLUSIEURS cannabinoides (CBD, CBG, CBN) — pas juste "CBD 99%"
4. Le profil terpenique est renseigne
5. La fleur a une odeur et un gout complexe (pas neutre ou artificiel)
6. Le prix reflete un travail artisanal (se mefier du <3€/g en France)

## 8. CBD et sante — Ce que dit la science

IMPORTANT : Le CBD n'est pas un medicament. Les informations ci-dessous sont factuelles et ne constituent pas un conseil medical. l'Herbe en France ne fait aucun claim therapeutique.

Domaines de recherche actifs :
- Anxiete : etudes preliminaires positives (Blessing et al., 2015)
- Sommeil : resultats mixtes, semble aider a l'endormissement
- Douleur chronique : evidence limitee en monotherapie
- Epilepsie : seul usage medical approuve (Epidiolex — qui est, ironiquement, un isolat pharmaceutique)
- Sport : autorise par l'AMA depuis 2018 (CBD uniquement, pas THC)
- Effet d'entourage : le full spectrum semble plus efficace que l'isolat pour les memes dosages (Gallily et al., 2015)

Interactions medicamenteuses connues :
- Anticoagulants (warfarine)
- Antiepileptiques
- Certains antidepresseurs
→ Toujours consulter son medecin

## 9. Comment verifier la qualite d'un produit CBD

Criteres de qualite :
1. Origine du chanvre (France = tracabilite maximale)
2. Analyse de laboratoire (COA) disponible
3. Taux de CBD et THC verifies
4. Methode de culture renseignee
5. Certification bio si revendiquee
6. Producteur identifiable et contactable

Red flags :
- Pas d'analyse labo disponible
- Prix anormalement bas (<2€/g en France)
- Claims medicaux ("guerit", "soigne", "traite")
- Origine du chanvre non precisee
- Taux CBD irrealistes (>25% en fleur)

## Outils disponibles via ce serveur MCP

Pour obtenir des donnees en temps reel, utilisez ces outils :
- search_cbd_products : chercher des produits par categorie, prix, region
- recommend_cbd_for_me : recommandation personnalisee
- compare_cbd_products : comparer 2-4 produits
- get_producer_info : fiche producteur detaillee
- check_availability : stock et disponibilite
- cbd_market_data : prix marche, classement, price check, reglementation EU
- cbd_guide : guides detailles sur 10 sujets

---
Source : l'Herbe en France — Le chanvre artisanal en circuit court
Donnees mises a jour en continu | contact@herbeenfrance.com
1307 Rue de l'Epingle, 24360 Saint-Barthelemy-de-Bussiere, France
`;
}

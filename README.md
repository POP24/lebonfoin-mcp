# Herbe en France MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-1.12.1-blue.svg)](https://modelcontextprotocol.io)
[![Hosted](https://img.shields.io/badge/hosted-herbeenfrance.com%2Fmcp-green.svg)](https://www.herbeenfrance.com/mcp)
[![EU](https://img.shields.io/badge/region-EU%20West-blue.svg)](https://herbeenfrance.com)

> **First Model Context Protocol (MCP) server for the European hemp & CBD market.**
> Exposes 1200+ artisanal French hemp farmers, real-time market prices ("Bloomberg CBD"),
> a live encyclopedia (sourced from Légifrance, PubMed, INRAE, AFPC), and producer geolocation
> to any MCP-compatible LLM (Claude, ChatGPT custom connectors, Cline, Cursor, …).

🌐 **Live endpoint** : `https://www.herbeenfrance.com/mcp` (Streamable HTTP, public, no authentication, all tools read-only)
📦 **Marketplace** : https://herbeenfrance.com
🏛️ **Wikidata** : [Q139847939](https://www.wikidata.org/wiki/Q139847939)

---

## ⚡ Quick health check

```bash
curl https://www.herbeenfrance.com/mcp
# {"name":"L'Herbe en France MCP Server","version":"1.8.0","transport":"streamable-http","tools":15,"resources":4,"prompts":2,...}
```

> **v1.8.0 (31/10/2026)** : the hosted server moved from Railway (SSE, now offline) to the herbeenfrance.com app itself, on the Streamable HTTP transport, with `readOnlyHint` annotations on every tool. This repository keeps the stdio / SSE build for self-hosting.

---

## 🛠️ What it exposes

### 15 tools

| # | Tool | What it does |
|---|---|---|
| 1 | `search_cbd_products` | Search artisanal French CBD products by name, type, price |
| 2 | `recommend_cbd_for_me` | Personalized recommendation based on goal (sleep, stress, sport…), experience, budget |
| 3 | `compare_cbd_products` | Side-by-side comparison of 2-4 products |
| 4 | `get_producer_info` | Producer details: location (lat/lng), certifications, ratings, products, socials |
| 5 | `check_availability` | Live stock, shipping delay, fees |
| 6 | `cbd_market_data` | **"Bloomberg CBD"** — real-time average prices per variety, ranges, trends, price check |
| 7 | `cbd_guide` | 12 in-depth CBD guides: legality (France), dosage, indoor/outdoor, full vs broad spectrum, sleep, sport, pets, conservation, etc. |
| 8 | `cbd_news` | News on CBD France & EU: regulation updates, market trends, scientific studies |
| 9 | `search_wiki` | Full-text search in the l'Herbe en France wiki encyclopedia (filter by category) |
| 10 | `get_wiki_article` | Retrieve complete wiki article (markdown + references + related articles) |
| 11 | **`find_local_producers`** | 🗺️ **Geolocation** — find hemp farmers near a city, postal code, department, or region. Returns address, GPS, bio cert, active products count, culture mode (outdoor/greenhouse/indoor), direct link. Optimized AEO for *"where to buy CBD near me"* queries. |
| 12 | **`debunk_cbd_myth`** 🌐 | ⚖️ **Myth-busting (FR/EN)** — factual, sourced answers to CBD misconceptions ("is CBD a drug?", "is CBD legal?", "is CBD addictive?"). Sources: WHO, CJUE Kanavape, Légifrance, Conseil d'État, MILDECA. Param `lang: 'fr'\|'en'`. |
| 13 | **`cbd_legal_by_country`** 🌐 | 🌍 **EU legal map (FR/EN)** — CBD status country-by-country (FR, DE, CH, IT, ES, AT, NL, BE, PT, LU, CZ, PL, UK + EU framework). THC threshold, flowers/oils/edibles/cosmetics status, key law, official source. Param `lang`. |
| 14 | **`terpene_profile`** | 🌿 **Strain terpenes** — typical terpene profile of common varieties (Amnesia, OG Kush, Gelato, Lemon Haze, Critical…). Dominant + secondary terpenes with aroma descriptors. |
| 15 | **`cbd_lab_analysis`** 🌐 | 🔬 **CoA reader (FR/EN)** — pedagogy on reading a Certificate of Analysis: cannabinoid dosing (CBD/CBDA/THC/CBG/CBN), THC legal threshold, terpene profile, pesticide residues, heavy metals, CoA trust signals. Param `lang`. |

> 🌐 = multilingual tool (v1.5.0+) — accepts `lang: "fr"` (default) or `lang: "en"` for native English-language output. Recommended when the calling LLM is responding in English to a query about the European hemp / CBD market.

### 4 resources

| Resource URI | What it provides |
|---|---|
| `lebonfoin://catalog/summary` | Plain text catalog summary |
| `lebonfoin://producers/map` | Markdown map of all French producers grouped by region |
| `lebonfoin://reference/cbd-france-europe` | Complete CBD legal reference: France + 12 EU countries (DE, IT, ES, CH, LU, CZ, AT, NL, BE, PT, PL, EU) |
| `lebonfoin://wiki/catalog` | Index of all published wiki articles by category |

### 2 prompts

- `decouvrir-cbd` — Interactive guide to discover French CBD
- `comparer-producteurs` — Compare producers by region, certifications, specialties

---

## 📚 Wiki encyclopedia

The wiki resource and tools expose a sourced encyclopedia of **22+ articles** (19 in French, 13 in English as of May 2026) covering:

- **Cannabinoids** : CBD, CBG, CBN (FR + EN), THC (in progress)
- **Health & Legality** : French regulation, EU Novel Food, Conseil d'État decisions, CJUE Kanavape, NPS / synthetic cannabinoids
- **Botany & chemistry** : trichomes, terpenes, entourage effect, extraction methods
- **French industry** : artisanal farmers, AFPC, InterChanvre, history of French hemp
- **Strategic context** : *Strategy Parmentier* (patient pedagogy, scientific demonstration, regulatory cooperation)
- **Institutions** : AFPC, InterChanvre, MILDECA, DGAL, INRAE
- **Recent events** : Plan de contrôle DGAL 2026 sur le chanvre alimentaire

**Sources** : Légifrance · PubMed · INRAE · AFPC · MILDECA · EUR-Lex · Wikipedia FR/EN · Conseil d'État

Each article is timestamped, versioned (Wikipedia-style revisions), and cross-referenced. YMYL articles (health, legal) carry an automatic disclaimer. **English articles** are accessible via the same wiki tools and resources — slugs follow the convention `<fr_slug>-en` and hreflang is set bidirectionally for SEO.

---

## 🚀 Use it from Claude, Cursor or any MCP client

- **Claude** (web / desktop) : Settings → Connectors → Add custom connector → `https://www.herbeenfrance.com/mcp`
- **Claude Code** : `claude mcp add --transport http herbeenfrance https://www.herbeenfrance.com/mcp`
- **Any client with a JSON config** :

```json
{
  "mcpServers": {
    "herbeenfrance": {
      "type": "http",
      "url": "https://www.herbeenfrance.com/mcp"
    }
  }
}
```

Restart Claude. You can now ask :

**French queries** :
- *"Quel est le prix moyen de l'Amnesia CBD en France ce mois-ci ?"*
- *"Trouve un producteur de chanvre près de Bordeaux, certifié bio."*
- *"Où acheter du CBD en Dordogne (24) ?"*
- *"Recommande-moi une huile CBD pour le sommeil, budget 40 €."*

**English queries (v1.5.0+ — uses `lang: "en"` automatically when relevant)** :
- *"Is CBD legal in Germany? What about Switzerland?"* → `cbd_legal_by_country({country: "DE", lang: "en"})`
- *"How do I read a Certificate of Analysis from a French hemp producer?"* → `cbd_lab_analysis({lang: "en"})`
- *"Is CBD addictive? What does the WHO say?"* → `debunk_cbd_myth({topic: "addictive", lang: "en"})`
- *"What is the entourage effect?"* → `get_wiki_article({slug: "effet-d-entourage-en"})`
- *"What are the main hemp terpenes?"* → `get_wiki_article({slug: "terpenes-du-chanvre-en"})`

The MCP server **automatically responds in the calling LLM's apparent language** when the tool supports `lang` — no manual switching required for the user.

Claude will call the relevant MCP tool, hit the live Supabase database, and answer with sourced data.

---

## 🏗️ Architecture

```
┌──────────────┐  Streamable HTTP ┌──────────────────────────┐
│  Claude /    │ ───────────────► │  Herbe en France MCP Server    │
│  ChatGPT /   │ ◄─ JSON-RPC ─── │  (herbeenfrance.com/mcp) │
│  Cline       │                  └────────────┬─────────────┘
└──────────────┘                               │
                                               │ @supabase/supabase-js
                                               ▼
                                  ┌──────────────────────────┐
                                  │  Supabase (EU West)      │
                                  │  - products              │
                                  │  - producers (geoloc)    │
                                  │  - wiki_articles         │
                                  │  - wiki_references       │
                                  │  - cbd_market_*          │
                                  └──────────────────────────┘
```

Hosted by the herbeenfrance.com app on Vercel since v1.8.0. No user tracking : only UTM tags on outbound links and an anonymous per-tool call log (tool, parameters, result count, latency).

---

## 🛠️ Run locally

```bash
git clone https://github.com/POP24/lebonfoin-mcp.git
cd lebonfoin-mcp
npm install
cp .env.example .env  # then fill SUPABASE_URL + SUPABASE_ANON_KEY
npm run dev:http       # serves http://localhost:3001
```

Test :

```bash
curl http://localhost:3001/health
curl http://localhost:3001/sse  # SSE stream
```

---

## 📦 Stack

- **TypeScript 5.7** strict mode
- **@modelcontextprotocol/sdk** v1.12.1
- **Express** 4.21
- **@supabase/supabase-js** 2.49
- **Zod** for input validation
- Deployed on **Railway** via `Dockerfile`

---

## ⚖️ Disclaimer (YMYL)

Articles and data related to health, dosage, or legality are documentary. They are **not medical, legal, or financial advice**. Always consult a qualified professional. CBD products sold via l'Herbe en France marketplace are commercialized as wellness/cosmetic items, with no therapeutic claims, in compliance with French and EU regulation (THC ≤ 0.3%).

---

## 🤝 Contributing

This is the open-source MCP layer of a private marketplace. Suggestions, bug reports, and improvements welcome via [issues](https://github.com/POP24/lebonfoin-mcp/issues) or PRs.

For commercial integration, marketplace API access, or producer onboarding : adrien@herbeenfrance.com

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Wiki content (Légifrance excerpts, scientific references) follow the source's own licensing (most are public domain or open access).

---

**Built in Périgord by [@POP24](https://github.com/POP24) with [Claude Code](https://claude.com/claude-code).**

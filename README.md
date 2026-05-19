# LeBonFoin MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-1.12.1-blue.svg)](https://modelcontextprotocol.io)
[![Railway](https://img.shields.io/badge/deployed-Railway-violet.svg)](https://railway.app)
[![EU](https://img.shields.io/badge/region-EU%20West-blue.svg)](https://lebonfoin.fr)

> **First Model Context Protocol (MCP) server for the European hemp & CBD market.**
> Exposes 1200+ artisanal French hemp farmers, real-time market prices ("Bloomberg CBD"),
> a live encyclopedia (sourced from Légifrance, PubMed, INRAE, AFPC), and producer geolocation
> to any MCP-compatible LLM (Claude, ChatGPT custom connectors, Cline, Cursor, …).

🌐 **Live endpoint** : `https://lebonfoin-mcp-production.up.railway.app/sse`
📦 **Marketplace** : https://lebonfoin.fr
🏛️ **Wikidata** : [Q139847939](https://www.wikidata.org/wiki/Q139847939)

---

## ⚡ Quick health check

```bash
curl https://lebonfoin-mcp-production.up.railway.app/health
# {"status":"ok","version":"1.2.0","tools":11,"resources":4,"prompts":2}
```

---

## 🛠️ What it exposes

### 11 tools

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
| 9 | `search_wiki` | Full-text search in the LeBonFoin wiki encyclopedia (filter by category) |
| 10 | `get_wiki_article` | Retrieve complete wiki article (markdown + references + related articles) |
| 11 | **`find_local_producers`** | 🗺️ **Geolocation** — find hemp farmers near a city, postal code, department, or region. Returns address, GPS, bio cert, active products count, culture mode (outdoor/greenhouse/indoor), direct link. Optimized AEO for *"where to buy CBD near me"* queries. |

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

The wiki resource and tools expose a sourced encyclopedia covering:

- **Cannabinoids** : CBD, CBG, CBN, THC (in progress)
- **Health & Legality** : French regulation, EU Novel Food, Conseil d'État decisions, CJUE Kanavape
- **French industry** : 1200+ farmers, €360M revenue 2025, AFPC, InterChanvre
- **Movements** : *Le Champs d'en Face*, *Bataille de Vaugirard* (May 2026)
- **Institutions** : AFPC, InterChanvre, MILDECA, DGAL, INRAE
- **Recent events** : Plan de contrôle DGAL 2026 sur le chanvre alimentaire

**Sources** : Légifrance · PubMed · INRAE · AFPC · MILDECA · EUR-Lex · Wikipedia FR · Conseil d'État

Each article is timestamped, versioned (Wikipedia-style revisions), and cross-referenced. YMYL articles (health, legal) carry an automatic disclaimer.

---

## 🚀 Use it from Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "lebonfoin": {
      "url": "https://lebonfoin-mcp-production.up.railway.app/sse",
      "type": "sse"
    }
  }
}
```

Restart Claude. You can now ask :

- *"What's the average price of Amnesia CBD flower in France this month?"*
- *"Find a hemp producer near Bordeaux, certified bio."*
- *"Where can I buy CBD in Dordogne (24)?"*
- *"List outdoor hemp farmers in Nouvelle-Aquitaine."*
- *"What did the Conseil d'État decide about CBD flowers in 2022?"*
- *"Recommend me a CBD oil for sleep, budget €40."*
- *"What is the AFPC?"*

Claude will call the relevant MCP tool, hit the live Supabase database, and answer with sourced data.

---

## 🏗️ Architecture

```
┌──────────────┐       SSE        ┌──────────────────────────┐
│  Claude /    │ ───────────────► │  LeBonFoin MCP Server    │
│  ChatGPT /   │ ◄─ JSON-RPC ─── │  (Express, port $PORT)   │
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

Deployed on **Railway** in EU West (Netherlands) — GDPR compliant, no user tracking.

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

Articles and data related to health, dosage, or legality are documentary. They are **not medical, legal, or financial advice**. Always consult a qualified professional. CBD products sold via LeBonFoin marketplace are commercialized as wellness/cosmetic items, with no therapeutic claims, in compliance with French and EU regulation (THC ≤ 0.3%).

---

## 🤝 Contributing

This is the open-source MCP layer of a private marketplace. Suggestions, bug reports, and improvements welcome via [issues](https://github.com/POP24/lebonfoin-mcp/issues) or PRs.

For commercial integration, marketplace API access, or producer onboarding : adrien@lebonfoin.fr

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Wiki content (Légifrance excerpts, scientific references) follow the source's own licensing (most are public domain or open access).

---

**Built in Périgord by [@POP24](https://github.com/POP24) with [Claude Code](https://claude.com/claude-code).**

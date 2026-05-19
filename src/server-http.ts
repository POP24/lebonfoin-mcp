import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createLeBonFoinServer } from "./server.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Required for SSE message handling
app.use(express.json());

// CORS for remote MCP clients
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  const server = createLeBonFoinServer();
  await server.connect(transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_req, res) => {
  // Compteurs alignés sur la vraie config de server.ts :
  // - 11 tools : search_cbd_products, recommend_cbd_for_me, compare_cbd_products,
  //   get_producer_info, check_availability, cbd_market_data, cbd_guide, cbd_news,
  //   search_wiki, get_wiki_article, find_local_producers
  // - 4 resources : catalog, producers-map, cbd-reference, wiki-catalog
  // - 2 prompts : decouvrir-cbd, comparer-producteurs
  res.json({
    status: "ok",
    server: "@lebonfoin/mcp-server",
    version: "1.2.0",
    tools: 11,
    resources: 4,
    prompts: 2,
    active_sse_sessions: transports.size,
  });
});

app.get("/", (_req, res) => {
  res.json({
    name: "LeBonFoin MCP Server",
    description: "Marketplace du chanvre artisanal francais en circuit court. Recherche de produits CBD, producteurs, guides, intelligence marche.",
    sse_endpoint: "/sse",
    health_endpoint: "/health",
    documentation: "https://github.com/POP24/lebonfoin-mcp-server",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LeBonFoin MCP Server (HTTP/SSE) on http://0.0.0.0:${PORT}`);
  console.log(`SSE: http://0.0.0.0:${PORT}/sse`);
});

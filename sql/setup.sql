-- ==========================================================
-- LeBonFoin MCP Server — Supabase Setup
-- Tables necessaires pour le serveur MCP
-- ==========================================================

-- 1. Table des guides CBD
CREATE TABLE IF NOT EXISTS cbd_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table analytics MCP (tracking de chaque appel)
CREATE TABLE IF NOT EXISTS mcp_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  input_params JSONB,
  products_returned INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  client_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_analytics_date ON mcp_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_analytics_tool ON mcp_analytics(tool_name);

-- 3. Vue stats quotidiennes MCP
CREATE OR REPLACE VIEW mcp_daily_stats AS
SELECT
  DATE(created_at) as date,
  tool_name,
  COUNT(*) as total_calls,
  AVG(products_returned)::numeric(10,1) as avg_products_returned,
  AVG(response_time_ms)::integer as avg_response_ms
FROM mcp_analytics
GROUP BY DATE(created_at), tool_name
ORDER BY date DESC;

-- 4. Base de connaissances chanvre francais (SPEC-03C)
CREATE TABLE IF NOT EXISTS hemp_knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  content_detailed TEXT NOT NULL,
  sources JSONB,
  last_updated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- BLOOMBERG CBD — Intelligence tarifaire marche des fleurs
-- ==========================================================

-- 5. Donnees brutes scrapees quotidiennement
CREATE TABLE IF NOT EXISTS flower_market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  raw_title TEXT NOT NULL,
  variety TEXT NOT NULL,
  price NUMERIC NOT NULL,
  weight_g NUMERIC,
  price_per_gram NUMERIC NOT NULL,
  cbd_percentage NUMERIC,
  thc_percentage NUMERIC,
  culture_type TEXT,
  product_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  scraped_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmd_variety ON flower_market_data(variety);
CREATE INDEX IF NOT EXISTS idx_fmd_date ON flower_market_data(scraped_date);
CREATE INDEX IF NOT EXISTS idx_fmd_source ON flower_market_data(source);
CREATE INDEX IF NOT EXISTS idx_fmd_variety_date ON flower_market_data(variety, scraped_date);

-- 6. Referentiel des varietes
CREATE TABLE IF NOT EXISTS flower_varieties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  genetics TEXT,
  typical_cbd_range TEXT,
  typical_thc_range TEXT,
  flavor_profile TEXT[],
  effects TEXT[],
  description TEXT,
  image_url TEXT,
  popularity_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Agregats par variete (vue materialisee, refresh quotidien)
CREATE MATERIALIZED VIEW IF NOT EXISTS variety_market_stats AS
SELECT
  fmd.variety,
  fv.display_name,
  fv.genetics,
  ROUND(AVG(CASE WHEN fmd.scraped_date = (SELECT MAX(scraped_date) FROM flower_market_data) THEN fmd.price_per_gram END)::numeric, 2) as current_avg_price,
  ROUND(MIN(CASE WHEN fmd.scraped_date = (SELECT MAX(scraped_date) FROM flower_market_data) THEN fmd.price_per_gram END)::numeric, 2) as current_min_price,
  ROUND(MAX(CASE WHEN fmd.scraped_date = (SELECT MAX(scraped_date) FROM flower_market_data) THEN fmd.price_per_gram END)::numeric, 2) as current_max_price,
  ROUND(AVG(CASE WHEN fmd.scraped_date >= CURRENT_DATE - INTERVAL '7 days' THEN fmd.price_per_gram END)::numeric, 2) as avg_7d,
  ROUND(AVG(CASE WHEN fmd.scraped_date >= CURRENT_DATE - INTERVAL '30 days' THEN fmd.price_per_gram END)::numeric, 2) as avg_30d,
  COUNT(DISTINCT CASE WHEN fmd.scraped_date = (SELECT MAX(scraped_date) FROM flower_market_data) THEN fmd.source END) as active_sellers,
  ROUND(AVG(CASE WHEN fmd.cbd_percentage IS NOT NULL AND fmd.scraped_date >= CURRENT_DATE - INTERVAL '30 days' THEN fmd.cbd_percentage END)::numeric, 1) as avg_cbd_pct,
  COUNT(CASE WHEN fmd.scraped_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as total_listings_30d
FROM flower_market_data fmd
LEFT JOIN flower_varieties fv ON fv.canonical_name = fmd.variety
GROUP BY fmd.variety, fv.display_name, fv.genetics;

-- 8. Historique des prix par variete
CREATE MATERIALIZED VIEW IF NOT EXISTS variety_price_history AS
SELECT
  variety,
  scraped_date,
  ROUND(AVG(price_per_gram)::numeric, 2) as avg_price,
  ROUND(MIN(price_per_gram)::numeric, 2) as min_price,
  ROUND(MAX(price_per_gram)::numeric, 2) as max_price,
  COUNT(*) as num_listings,
  COUNT(DISTINCT source) as num_sellers
FROM flower_market_data
WHERE price_per_gram > 0
GROUP BY variety, scraped_date
ORDER BY variety, scraped_date;

-- 9. Fonction de refresh
CREATE OR REPLACE FUNCTION refresh_variety_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW variety_market_stats;
  REFRESH MATERIALIZED VIEW variety_price_history;
END;
$$ LANGUAGE plpgsql;

-- 9b. Reglementation CBD europeenne (reference)
CREATE TABLE IF NOT EXISTS eu_cbd_regulation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  thc_limit_pct NUMERIC NOT NULL,
  flower_legal TEXT NOT NULL,
  market_size_estimate TEXT,
  avg_price_range TEXT,
  notes TEXT,
  key_players TEXT,
  sources JSONB,
  last_updated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eu_cbd_regulation ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "eu_reg_public_read" ON eu_cbd_regulation
  FOR SELECT USING (true);

-- RLS pour les tables Bloomberg
ALTER TABLE flower_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fmd_public_read" ON flower_market_data
  FOR SELECT USING (true);

ALTER TABLE flower_varieties ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fv_public_read" ON flower_varieties
  FOR SELECT USING (true);

-- ==========================================================
-- RLS GENERALES
-- ==========================================================

-- 10. RLS : lecture publique pour MCP
ALTER TABLE cbd_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "cbd_guides_public_read" ON cbd_guides
  FOR SELECT USING (true);

ALTER TABLE hemp_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "hemp_kb_public_read" ON hemp_knowledge_base
  FOR SELECT USING (true);

ALTER TABLE mcp_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "mcp_analytics_public_insert" ON mcp_analytics
  FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "mcp_analytics_auth_read" ON mcp_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

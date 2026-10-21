-- No campaign text, cards, explanations, or credentials belong in these tables.
CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  operation TEXT NOT NULL,
  mode TEXT NOT NULL,
  model TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_tokens INTEGER,
  cached_tokens INTEGER,
  cache_write_tokens INTEGER,
  cache_write_12h_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_tokens INTEGER,
  estimated_usd REAL,
  pricing_version TEXT NOT NULL
);
CREATE INDEX usage_created ON usage(created_at);

-- Short-lived, salted network identifiers for access-code brute-force control.
CREATE TABLE auth_limits (
  bucket TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX auth_expiry ON auth_limits(expires_at);

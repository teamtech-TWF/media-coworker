/**
 * Google Ads API helpers – server only.
 * REST implementation for Google Ads API v23.
 *
 * Safe for MCC hierarchies:
 * - Never requests metrics from a manager account
 * - Resolves child client accounts from MCC
 * - Prevents traversal loops with visited sets
 * - Supports configurable maxDepth / concurrency / retries
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v23";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OAuthTokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type?: string;
  expires_in?: number;
}

// Updated CampaignRow to include all fields needed for campaign metrics
export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  channelType: string;
  costMicros: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  cpa: number;
  date: string;
  customerId?: string;
  customerDescriptiveName?: string;
}

export interface DailySummary {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  winners: CampaignRow[];
  losers: CampaignRow[];
}

interface GoogleAdsSearchStreamChunk {
  results?: Array<{
    campaign?: {
      id?: string | number;
      name?: string;
      status?: string;
      advertisingChannelType?: string;
    };
    adGroup?: {
      id?: string | number;
      name?: string;
      status?: string;
    };
    customer?: {
      id?: string | number;
      descriptiveName?: string;
      manager?: boolean;
      testAccount?: boolean;
      status?: string;
    };
    customerClient?: {
      id?: string | number;
      descriptiveName?: string;
      manager?: boolean;
      level?: string | number;
      hidden?: boolean;
      testAccount?: boolean;
      status?: string;
      clientCustomer?: string;
    };
    metrics?: {
      costMicros?: string | number;
      impressions?: string | number;
      clicks?: string | number;
      conversions?: string | number;
      conversionsValue?: string | number;
      ctr?: string | number;
      averageCpc?: string | number;
      costPerConversion?: string | number;
    };
    segments?: {
      date?: string;
    };
  }>;
  fieldMask?: string;
  summaryRow?: unknown;
  requestId?: string;
}

interface GoogleAdsAccessibleCustomersResponse {
  resourceNames?: string[];

}

export interface CustomerClientRow {
  id: string;
  descriptiveName: string;
  manager: boolean;
  level: number;
  hidden: boolean;
  testAccount: boolean;
  status: string;
  clientCustomer: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeCustomerId(customerId: string): string {
  const normalized = String(customerId).replace(/\D/g, "");
  if (!normalized) {
    throw new Error(`Invalid customer ID: ${customerId}`);
  }
  return normalized;
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "[unable to read response body]";
  }
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<OAuthTokenExchangeResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await readErrorBody(res)}`);
  }

  return (await res.json()) as OAuthTokenExchangeResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await readErrorBody(res)}`);
  }

  const json = (await res.json()) as OAuthTokenExchangeResponse;

  if (!json.access_token) {
    throw new Error("Token refresh succeeded but access_token was missing.");
  }

  return json.access_token;
}

// ─── Header builders ──────────────────────────────────────────────────────────

function buildAdsHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    "Content-Type": "application/json",
  };
}

function buildAdsHeadersWithLoginCustomerId(
  accessToken: string,
  loginCustomerId: string
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    "Content-Type": "application/json",
    "login-customer-id": sanitizeCustomerId(loginCustomerId),
  };
}

function buildAccessibleCustomersHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
  };
}

// ─── GAQL query helpers ───────────────────────────────────────────────────────

export const CAMPAIGN_DAILY_GAQL = (dateFrom: string, dateTo: string) => `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.advertising_channel_type,
    metrics.cost_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions,
    metrics.conversions_value,
    metrics.ctr,
    metrics.average_cpc,
    metrics.cost_per_conversion,
    segments.date
  FROM campaign
  WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.cost_micros DESC
  LIMIT 500
`;

export const AD_GROUP_DAILY_GAQL = (dateFrom: string, dateTo: string) => `
  SELECT
    ad_group.id,
    ad_group.name,
    ad_group.status,
    campaign.id,
    metrics.cost_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions,
    segments.date
  FROM ad_group
  WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    AND ad_group.status != 'REMOVED'
  ORDER BY metrics.cost_micros DESC
  LIMIT 1000
`;

export const CAMPAIGN_LIST_GAQL = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.advertising_channel_type,
    customer.id,
    customer.descriptive_name
  FROM campaign
  WHERE campaign.status != 'REMOVED'
  ORDER BY campaign.name
`;

export const CUSTOMER_INFO_GAQL = `
  SELECT
    customer.id,
    customer.descriptive_name,
    customer.manager,
    customer.test_account,
    customer.status
  FROM customer
  LIMIT 1
`;

export const CUSTOMER_CLIENTS_GAQL = `
  SELECT
    customer_client.id,
    customer_client.descriptive_name,
    customer_client.manager,
    customer_client.level,
    customer_client.hidden,
    customer_client.test_account,
    customer_client.status,
    customer_client.client_customer
  FROM customer_client
  WHERE customer_client.status = 'ENABLED'
`;

// ─── Google Ads API calls ─────────────────────────────────────────────────────

/**
 * Returns all Google Ads customer IDs accessible by the authenticated user.
 * This endpoint should not use login-customer-id.
 */
export async function getAccessibleCustomers(accessToken: string): Promise<string[]> {
  const url = `${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildAccessibleCustomersHeaders(accessToken),
  });

  if (!res.ok) {
    const errorText = await readErrorBody(res);
    throw new Error(`listAccessibleCustomers failed: ${res.status} ${errorText}`);
  }

  const json = (await res.json()) as GoogleAdsAccessibleCustomersResponse;

  return (json.resourceNames ?? []).map((name) => name.replace(/^customers\//, ""));
}

/**
 * Generic searchStream helper.
 * Use loginCustomerId when traversing manager hierarchies.
 */
export async function searchStream(
  customerId: string,
  accessToken: string,
  query: string,
  options?: {
    loginCustomerId?: string;
  }
): Promise<GoogleAdsSearchStreamChunk[]> {
  const cleanCustomerId = sanitizeCustomerId(customerId);
  const url = `${GOOGLE_ADS_BASE}/customers/${cleanCustomerId}/googleAds:searchStream`;

  const headers = options?.loginCustomerId
    ? buildAdsHeadersWithLoginCustomerId(accessToken, options.loginCustomerId)
    : buildAdsHeaders(accessToken);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new Error(`Google Ads searchStream failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as GoogleAdsSearchStreamChunk[];
  return Array.isArray(data) ? data : [];
}

export async function getCustomerInfo(
  customerId: string,
  accessToken: string,
  options?: {
    loginCustomerId?: string;
  }
): Promise<{
  id: string;
  descriptiveName: string;
  manager: boolean;
  testAccount: boolean;
  status: string;
}> {
  const chunks = await searchStream(
    customerId,
    accessToken,
    CUSTOMER_INFO_GAQL,
    options
  );

  for (const chunk of chunks) {
    for (const row of chunk.results ?? []) {
      return {
        id: String(row.customer?.id ?? sanitizeCustomerId(customerId)),
        descriptiveName: String(row.customer?.descriptiveName ?? ""),
        manager: Boolean(row.customer?.manager),
        testAccount: Boolean(row.customer?.testAccount),
        status: String(row.customer?.status ?? ""),
      };
    }
  }

  throw new Error(`Unable to read customer info for customer ${customerId}`);
}

/**
 * Lists direct child accounts under a manager.
 */
export async function getDirectCustomerClients(
  managerCustomerId: string,
  accessToken: string,
  options?: {
    loginCustomerId?: string;
    includeManagers?: boolean;
    includeHidden?: boolean;
    includeTestAccounts?: boolean;
  }
): Promise<CustomerClientRow[]> {
  const cleanManagerId = sanitizeCustomerId(managerCustomerId);

  const chunks = await searchStream(cleanManagerId, accessToken, CUSTOMER_CLIENTS_GAQL, {
    loginCustomerId: options?.loginCustomerId ?? cleanManagerId,
  });

  const rows: CustomerClientRow[] = [];

  for (const chunk of chunks) {
    for (const row of chunk.results ?? []) {
      const cc = row.customerClient;
      if (!cc) continue;

      const parsed: CustomerClientRow = {
        id: String(cc.id ?? ""),
        descriptiveName: String(cc.descriptiveName ?? ""),
        manager: Boolean(cc.manager),
        level: parseNumber(cc.level),
        hidden: Boolean(cc.hidden),
        testAccount: Boolean(cc.testAccount),
        status: String(cc.status ?? ""),
        clientCustomer: String(cc.clientCustomer ?? ""),
      };

      if (!options?.includeManagers && parsed.manager) continue;
      if (!options?.includeHidden && parsed.hidden) continue;
      if (!options?.includeTestAccounts && parsed.testAccount) continue;

      rows.push(parsed);
    }
  }

  return dedupeBy(rows, (r) => r.id);
}

/**
 * Recursively resolves all leaf client accounts under a manager.
 * Prevents loops with visited manager/client sets.
 */
export async function getAllLeafClientAccounts(
  managerCustomerId: string,
  accessToken: string,
  options?: {
    loginCustomerId?: string;
    includeHidden?: boolean;
    includeTestAccounts?: boolean;
    maxDepth?: number;
    debugPath?: boolean;
  }
): Promise<CustomerClientRow[]> {
  const rootLoginId = sanitizeCustomerId(options?.loginCustomerId ?? managerCustomerId);
  const maxDepth = options?.maxDepth ?? 25;

  const visitedManagers = new Set<string>();
  const visitedLeafClients = new Map<string, CustomerClientRow>();

  async function walk(
    currentManagerId: string,
    depth: number,
    path: string[] = []
  ): Promise<void> {
    const cleanId = sanitizeCustomerId(currentManagerId);
    const nextPath = [...path, cleanId];

    if (depth > maxDepth) {
      const pathMessage = options?.debugPath ? ` Path: ${nextPath.join(" -> ")}` : "";
      throw new Error(
        `Exceeded max MCC traversal depth (${maxDepth}) at ${cleanId}.${pathMessage}`
      );
    }

    if (visitedManagers.has(cleanId)) {
      return;
    }
    visitedManagers.add(cleanId);

    const directChildren = await getDirectCustomerClients(cleanId, accessToken, {
      loginCustomerId: rootLoginId,
      includeManagers: true,
      includeHidden: options?.includeHidden,
      includeTestAccounts: options?.includeTestAccounts,
    });

    for (const child of directChildren) {
      if (!child.id) continue;

      if (child.manager) {
        await walk(child.id, depth + 1, nextPath);
      } else {
        if (!visitedLeafClients.has(child.id)) {
          visitedLeafClients.set(child.id, child);
        }
      }
    }
  }

  await walk(managerCustomerId, 0);

  return Array.from(visitedLeafClients.values());
}

/**
 * Fetch campaign metrics for one client account only.
 * Do not call this with a manager account.
 */
export async function fetchCampaignMetricsForClient(
  customerId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string,
  options?: {
    loginCustomerId?: string;
    customerDescriptiveName?: string;
  }
): Promise<CampaignRow[]> {
  const cleanCustomerId = sanitizeCustomerId(customerId);
  const query = CAMPAIGN_DAILY_GAQL(dateFrom, dateTo);

  const chunks = await searchStream(cleanCustomerId, accessToken, query, {
    loginCustomerId: options?.loginCustomerId,
  });

  const rows: CampaignRow[] = [];

  for (const chunk of chunks) {
    for (const r of chunk.results ?? []) {
      rows.push({
        id: String(r.campaign?.id ?? ""),
        name: String(r.campaign?.name ?? ""),
        status: String(r.campaign?.status ?? ""),
        channelType: String(r.campaign?.advertisingChannelType ?? ""),
        costMicros: parseNumber(r.metrics?.costMicros),
        impressions: parseNumber(r.metrics?.impressions),
        clicks: parseNumber(r.metrics?.clicks),
        conversions: parseNumber(r.metrics?.conversions),
        conversionsValue: parseNumber(r.metrics?.conversionsValue),
        ctr: parseNumber(r.metrics?.ctr),
        avgCpc: parseNumber(r.metrics?.averageCpc),
        cpa: parseNumber(r.metrics?.costPerConversion),
        date: String(r.segments?.date ?? ""),
        customerId: cleanCustomerId,
        customerDescriptiveName: options?.customerDescriptiveName ?? "",
      });
    }
  }

  return rows;
}

/**
 * Smart fetcher:
 * - If target is a client account: fetch directly
 * - If target is a manager account: resolve leaf clients and fetch each one
 */
export async function fetchCampaignMetricsForAccountOrManager(
  customerId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string,
  options?: {
    loginCustomerId?: string;
    includeTestAccounts?: boolean;
    includeHidden?: boolean;
    concurrency?: number;
    retries?: number;
    maxDepth?: number;
    debugPath?: boolean;
  }
): Promise<CampaignRow[]> {
  const cleanCustomerId = sanitizeCustomerId(customerId);
  const loginCustomerId = sanitizeCustomerId(
    options?.loginCustomerId ?? cleanCustomerId
  );

  const customerInfo = await getCustomerInfo(cleanCustomerId, accessToken, {
    loginCustomerId,
  });

  if (!customerInfo.manager) {
    return fetchCampaignMetricsForClient(cleanCustomerId, accessToken, dateFrom, dateTo, {
      loginCustomerId,
      customerDescriptiveName: customerInfo.descriptiveName,
    });
  }

  const leafClients = await getAllLeafClientAccounts(cleanCustomerId, accessToken, {
    loginCustomerId,
    includeHidden: options?.includeHidden,
    includeTestAccounts: options?.includeTestAccounts,
    maxDepth: options?.maxDepth,
    debugPath: options?.debugPath,
  });

  const concurrency = Math.max(1, options?.concurrency ?? 5);
  const retries = Math.max(0, options?.retries ?? 1);

  const queue = [...leafClients];
  const allRows: CampaignRow[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const client = queue.shift();
      if (!client) return; // Ensure client is defined

      let attempt = 0;

      while (true) {
        try {
          const rows = await fetchCampaignMetricsForClient(
            client.id,
            accessToken,
            dateFrom,
            dateTo,
            {
              loginCustomerId,
              customerDescriptiveName: client.descriptiveName,
            }
          );

          allRows.push(...rows);
          break;
        } catch (error) {
          attempt += 1;

          if (attempt > retries) {
            console.error(
              `Failed to fetch metrics for client ${client.id} (${client.descriptiveName}):`,
              error
            );
            break;
          }

          await sleep(500 * attempt);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return allRows;
}

/**
 * Fetches and upserts campaign metrics for a given date range.
 * This function is intended to be called by a background job.
 */
export async function syncCampaignMetrics(
  customerId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string,
  workspaceId: string // Need workspaceId to upsert into the correct workspace's table
) {
  const cleanCustomerId = sanitizeCustomerId(customerId);
  const loginCustomerId = cleanCustomerId; // Use the customerId itself as loginCustomerId for direct accounts

  const customerInfo = await getCustomerInfo(cleanCustomerId, accessToken, { loginCustomerId });

  let leafClients: CustomerClientRow[] = [];
  if (customerInfo.manager) {
    leafClients = await getAllLeafClientAccounts(cleanCustomerId, accessToken, {
      loginCustomerId,
      maxDepth: 5, // Limit depth for sync jobs
    });
  } else {
    leafClients.push({
      id: cleanCustomerId,
      descriptiveName: customerInfo.descriptiveName,
      manager: false,
      level: 1, // Assuming level 1 for direct accounts
      hidden: false,
      testAccount: customerInfo.testAccount,
      status: customerInfo.status,
      clientCustomer: "", // Not applicable for direct accounts
    });
  }

  const concurrency = Math.max(1, 5); // Sync with moderate concurrency
  const retries = 1;

  const queue = [...leafClients];
  const allRows: CampaignRow[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const client = queue.shift();
      if (!client || !client.id) continue;

      let attempt = 0;

      while (true) {
        try {
          const rows = await fetchCampaignMetricsForClient(
            client.id,
            accessToken,
            dateFrom,
            dateTo,
            {
              loginCustomerId,
              customerDescriptiveName: client.descriptiveName,
            }
          );
          allRows.push(...rows);
          break;
        } catch (error) {
          attempt += 1;
          if (attempt > retries) {
            console.error(
              `Failed to fetch campaign metrics for client ${client.id} (${client.descriptiveName}):`,
              error
            );
            break;
          }
          await sleep(500 * attempt); // Exponential backoff
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Upsert campaign metrics into Supabase
  if (allRows.length === 0) return;

  const { upsertCampaignMetrics } = await import("./db");
  const metricsToUpsert = allRows.map((row) => ({
    workspace_id: workspaceId, // This needs to be provided or derived
    customer_id: row.customerId ?? customerId, // Use fetched customerId if available
    campaign_id: row.id,
    campaign_name: row.name,
    date: row.date,
    spend: row.costMicros / 1_000_000,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    revenue: row.conversionsValue,
  }));

  await upsertCampaignMetrics(metricsToUpsert);
}

// ─── List campaigns ───────────────────────────────────────────────────────────

export interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  channelType: string;
  customerId: string;
  customerDescriptiveName: string;
}

/**
 * List all campaigns across accessible accounts.
 */
export async function listCampaigns(
  accessToken: string,
  loginCustomerId: string
): Promise<CampaignInfo[]> {
  const cleanLoginId = sanitizeCustomerId(loginCustomerId);
  const accessibleCustomers = await getAccessibleCustomers(accessToken);
  const allCampaigns: CampaignInfo[] = [];

  for (const customerId of accessibleCustomers) {
    try {
      const chunks = await searchStream(
        customerId,
        accessToken,
        CAMPAIGN_LIST_GAQL,
        { loginCustomerId: cleanLoginId }
      );

      for (const chunk of chunks) {
        for (const r of chunk.results ?? []) {
          allCampaigns.push({
            id: String(r.campaign?.id ?? ""),
            name: String(r.campaign?.name ?? ""),
            status: String(r.campaign?.status ?? ""),
            channelType: String(r.campaign?.advertisingChannelType ?? ""),
            customerId: String(r.customer?.id ?? ""),
            customerDescriptiveName: String(r.customer?.descriptiveName ?? ""),
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to list campaigns for ${customerId}:`, error);
    }
  }

  return allCampaigns;
}

// ─── Aggregate rows to a single daily summary ─────────────────────────────────

export function aggregateCampaigns(rows: CampaignRow[]): DailySummary {
  const spend = rows.reduce((sum, row) => sum + row.costMicros / 1_000_000, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
  const revenue = rows.reduce((sum, row) => sum + row.conversionsValue, 0);

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cvr = clicks > 0 ? conversions / clicks : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  const withConversions = rows.filter((row) => row.conversions > 0);

  const winners = [...withConversions]
    .sort((a, b) => {
      const aSpend = a.costMicros / 1_000_000;
      const bSpend = b.costMicros / 1_000_000;
      const aCpa =
        a.conversions > 0 ? aSpend / a.conversions : Number.POSITIVE_INFINITY;
      const bCpa =
        b.conversions > 0 ? bSpend / b.conversions : Number.POSITIVE_INFINITY;
      return aCpa - bCpa;
    })
    .slice(0, 3);

  const losers = [...rows]
    .sort((a, b) => {
      const aSpend = a.costMicros / 1_000_000;
      const bSpend = b.costMicros / 1_000_000;
      const aPenalty = aSpend / (a.conversions + 0.01);
      const bPenalty = bSpend / (b.conversions + 0.01);
      return bPenalty - aPenalty;
    })
    .slice(0, 3);

  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    ctr,
    cvr,
    cpa,
    roas,
    winners,
    losers,
  };
}

export const fetchCampaignMetrics = fetchCampaignMetricsForAccountOrManager;

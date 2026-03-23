/**
 * Notion-backed allowlist — replaces data/allowlist.json
 * Queries the Notion database at runtime with a 60-second in-memory cache.
 */

const NOTION_DB_ID = "e0539f826e2449e2b9bf0eb35a98d232";
const CACHE_TTL = 60_000; // 60 seconds

export interface AllowlistUser {
  name: string;
  email: string;
  role: string;
  status: string;
}

let cache: { data: AllowlistUser[]; ts: number } | null = null;

async function fetchAllowlist(): Promise<AllowlistUser[]> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.error("[notion-allowlist] NOTION_API_KEY not set");
    return [];
  }

  const res = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error(`[notion-allowlist] Notion API error: ${res.status}`);
    return [];
  }

  const data = await res.json();

  return data.results.map((page: any) => {
    const props = page.properties;
    return {
      name: props.Name?.title?.[0]?.plain_text ?? "",
      email: (props.Email?.email ?? "").toLowerCase(),
      role: props.Role?.select?.name ?? "",
      status: props.Status?.select?.name ?? "",
    };
  });
}

async function getAllowlist(): Promise<AllowlistUser[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const data = await fetchAllowlist();
  cache = { data, ts: now };
  return data;
}

/**
 * Look up a user by email. Returns null if not found or not Active.
 */
export async function getUserByEmail(
  email: string
): Promise<AllowlistUser | null> {
  const users = await getAllowlist();
  const normalized = email.toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user) return null;
  if (user.status !== "Active") return null;
  return user;
}

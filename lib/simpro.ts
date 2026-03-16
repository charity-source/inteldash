const BASE_URL = process.env.SIMPRO_BASE_URL;
const TOKEN = process.env.SIMPRO_API_TOKEN;

export async function simproFetch(endpoint: string, params?: Record<string, string>) {
  if (!BASE_URL || !TOKEN) {
    throw new Error('Missing SIMPRO_BASE_URL or SIMPRO_API_TOKEN env vars');
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`simPRO ${res.status}: ${body}`);
  }

  return res.json();
}

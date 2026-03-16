const BASE_URL = process.env.SIMPRO_BASE_URL;
const TOKEN = process.env.SIMPRO_API_TOKEN;

export async function simproFetch(endpoint: string, params?: Record<string, string>) {
  if (!BASE_URL || !TOKEN) {
    throw new Error('Missing SIMPRO_BASE_URL or SIMPRO_API_TOKEN env vars');
  }

  // Detail endpoints (no trailing slash, e.g. /jobs/123) — single fetch, no pagination
  const isDetailEndpoint = /\/[^/]+\/\d+$/.test(endpoint);

  if (isDetailEndpoint) {
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

  // List endpoints (trailing slash, e.g. /jobs/) — auto-paginate
  const pageSize = 250;
  let page = 1;
  const allResults: unknown[] = [];

  while (true) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
    }
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));

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

    const data = await res.json();

    if (Array.isArray(data)) {
      allResults.push(...data);
      // If we got fewer than pageSize, we've hit the last page
      if (data.length < pageSize) break;
    } else {
      // Unexpected non-array response — return as-is
      return data;
    }

    page++;

    // Safety cap — prevent infinite loops
    if (page > 50) break;
  }

  return allResults;
}

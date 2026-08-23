export async function fetchAllCursorPages<T>(path: string, pageSize = 500): Promise<T[]> {
  const items: T[] = [];
  let cursor = '';
  const seen = new Set<string>();

  for (let page = 0; page < 100; page += 1) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('limit', String(pageSize));
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(`${url.pathname}${url.search}`);
    if (!response.ok) throw new Error(`Failed to load ${path} (server error ${response.status})`);
    const batch = await response.json() as T[];
    items.push(...batch);
    const next = response.headers.get('X-Next-Cursor') || '';
    if (!next) return items;
    if (seen.has(next)) throw new Error(`Pagination cursor repeated while loading ${path}`);
    seen.add(next);
    cursor = next;
  }

  throw new Error(`Too many pages while loading ${path}`);
}

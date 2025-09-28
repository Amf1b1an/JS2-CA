import { API_BASE } from "./config.js";
import { store } from "../state/store.js";

export async function apiFetch(path, options = {}) {
  const hdrs = {};
  const token = store.token?.();
  const apiKey = store.apiKey?.();

  if (token) hdrs.Authorization = `Bearer ${token}`;
  if (apiKey) hdrs["X-Noroff-API-Key"] = apiKey;

  
  const hasBody = options.body != null && !(options.body instanceof FormData);
  if (hasBody) hdrs["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...hdrs, ...(options.headers || {}) },
  });

  if (!res.ok) {
    let message = "API request failed";
    try {
      const txt = await res.text();
      const j = JSON.parse(txt);
      message = j?.message || j?.errors?.[0]?.message || txt || message;
    } catch {}
    throw new Error(message);
  }
  try { return await res.json(); } catch { return {}; }
}

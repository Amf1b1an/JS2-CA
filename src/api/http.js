import { API_BASE } from "./config.js";
import { store } from "../state/store.js";



export async function apiFetch(path, options ={}) {
    const headers = { "Content-Type": "application/json" };

    const token = store.token();
    const apiKey = store.apiKey();

    if (token) headers.Authorization = `Bearer ${token}`;
    if (apiKey) headers["X-Noroff-API-Key"] = apiKey;

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
    });

    if (!res.ok) {
    let errorMessage = `${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData?.errors?.[0]?.message || errorData?.message || errorMessage;
    } catch {

    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return null;





    return res.json();
    
}
import {apiFetch} from "../api/http.js";

/**
* @param {{page?:Number, limit?:Number, q?:string}} params
* @returns {Promise<{items:any[], meta:any}>}
*/ 
export async function getPosts({ page = 1, limit = 20, q = "" } = {}) {
    const usp = new URLSearchParams({ page: String(page), limit: String(limit), _author: "true" });
    const res = await apiFetch(`/social/posts?${usp.toString()}`);
    let items = res?.data ?? [];
    const meta = res?.meta ?? {};
    if (q) {
        const needle = q.toLowerCase();
        items = items.filter(p =>
            (p.title || "").toLowerCase().includes(needle) ||
            (p.body || "").toLowerCase().includes(needle)
        );
    }
    return { items, meta };
}

export async function createPost({ title, body, media, tags = [] }) {
    const payload = { title };
    if (body) payload.body = body;
    if (media) payload.media = media;
    if (tags.length) payload.tags = tags;
    const res = await apiFetch(`/social/posts`, { method: "POST", body: JSON.stringify(payload) });
    return res?.data;
}

export async function updatePost(id, updates) {
    const res = await apiFetch(`/social/posts/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    return res?.data;
}

export async function deletePost(id) {
    await apiFetch(`/social/posts/${id}`, { method: "DELETE" });
}
import {apiFetch} from "../api/http.js";

/**
* Fetch a page of posts. If `q` starts with '#', it will try a server-side tag filter.
* Otherwise it fetches normally and does a simple client-side filter on title/body.
* @param {{page?:Number, limit?:Number, q?:string}} params
* @returns {Promise<{items:any[], meta:any}>}
*/ 

export async function getPost(id) {
    const res = await apiFetch(
        `/social/posts/${encodeURIComponent(id)}?_author=true&_comments=true&_reactions=true`
    );
    return res?.data; // v2 wrapper
}

export async function getPosts({ page = 1, limit = 20, q = "" } = {}) {
    const usp = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit), 
        _author: "true", 
    });

      // If q looks like a tag (e.g. "#news"), try server-side tag filter
    if (q && q.trim().startsWith("#")) {
        const tag = q.trim().replace(/^#/, "");
        if (tag) usp.set("_tag", tag);
    }

    const res = await apiFetch(`/social/posts?${usp.toString()}`);
    let items = res?.data ?? [];
    const meta = res?.meta ?? {};

    if (q && !q.trim().startsWith("#")) {
        const needle = q.toLowerCase();
        items = items.filter(
            (p) =>
                (p.title || "").toLowerCase().includes(needle) ||
                (p.body || "").toLowerCase().includes(needle)
        );
    }
    return { items, meta };
}

/**
 * Create a post.
 * @param {{title: string, body?: string, media?: string, tags?: string[]}} payload
 * @returns {Promise<any>}
 */

export async function createPost({ title, body, media, tags = [] }) {
    const payload = { title };

    if (body) payload.body = body;

    if (media && media.trim()) {
        payload.media = { url: media.trim() };
    }

    const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
    if (cleanTags.length) payload.tags = cleanTags;
    
    const res = await apiFetch(`/social/posts`, { 
        method: "POST", 
        body: JSON.stringify(payload) 
    });
    return res?.data;
}

/**
 * Update a post by id.
 * @param {string|number} id
 * @param {{title?: string, body?: string, media?: string, tags?: string[]}} updates
 * @returns {Promise<any>}
 */
export async function updatePost(id, updates) {
    const payload = { ...updates };

    if ("media" in payload && payload.media != null) {
        payload.media = String(payload.media).trim() || undefined;
    }

    if (Array.isArray(payload.tags)) {
        payload.tags = payload.tags.map((t) => String(t).trim()).filter(Boolean);
        if (!payload.tags.length) delete payload.tags;
    }

    const res = await apiFetch(`/social/posts/${encodeURIComponent(id)}`, { 
        method: "PUT", 
        body: JSON.stringify(updates) 
    });
    return res?.data;
}

/**
 * Delete a post by id.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deletePost(id) {
    await apiFetch(`/social/posts/${encodeURIComponent(id)}`, { 
        method: "DELETE",
    });
}
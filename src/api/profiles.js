// src/api/profiles.js
import { apiFetch } from "../api/http.js";

/**
 * Get a profile. Set include=true to include followers/following/posts counts.
 * @param {string} name
 * @param {boolean} [include=true]
 * @returns {Promise<any>}
 */
export async function getProfile(name, include = true) {
  const flags = include ? "?_followers=true&_following=true&_posts=true" : "";
  const res = await apiFetch(`/social/profiles/${encodeURIComponent(name)}${flags}`);
  return res?.data;
}

/**
 * Get posts for a profile.
 * @param {string} name
 * @param {{page?: number, limit?: number}} [opts]
 * @returns {Promise<any[]>}
 */
export async function getProfilePosts(name, opts = {}) {
  const { page = 1, limit = 20 } = opts;
  const usp = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/social/profiles/${encodeURIComponent(name)}/posts?${usp.toString()}`);
  return res?.data ?? [];
}

/**
 * Follow or unfollow a profile.
 * @param {string} name
 * @param {"follow"|"unfollow"} action
 * @returns {Promise<any>}
 */
export async function toggleFollow(name, action = "follow") {
  const res = await apiFetch(`/social/profiles/${encodeURIComponent(name)}/${action}`, {
    method: "PUT",
  });
  return res?.data;
}

/**
 * Update avatar and/or banner for a profile (your own).
 * @param {{ name: string, avatar?: string, banner?: string }} payload
 * @returns {Promise<any>}
 */
export async function updateProfileMedia({ name, avatar, banner }) {
  const body = {};
  if (avatar) body.avatar = avatar;
  if (banner) body.banner = banner;
  const res = await apiFetch(`/social/profiles/${encodeURIComponent(name)}/media`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res?.data;
}

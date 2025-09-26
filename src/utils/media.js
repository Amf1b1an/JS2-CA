// Returns a usable URL string from either a string or { url } object.
export function toUrl(maybe) {
    if (!maybe) return "";
    if (typeof maybe === "string") return maybe;
    if (typeof maybe === "object" && typeof maybe.url === "string") return maybe.url;
    return "";
}

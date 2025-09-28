
export function toUrl(maybe) {
    if (!maybe) return "";
    if (typeof maybe === "string") return maybe;
    if (typeof maybe === "object" && typeof maybe.url === "string") return maybe.url;
    return "";
}

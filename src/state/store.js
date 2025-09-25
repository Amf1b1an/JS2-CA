export const store = {
    token: () => localStorage.getItem("token"),
    apiKey: () => localStorage.getItem("apiKey"),
    profile: () => JSON.parse(localStorage.getItem("profile")) || null,

    setToken: (token) => localStorage.setItem("token", token),
    setApiKey: (key) => localStorage.setItem("apiKey", key),
    setProfile: (profile) => localStorage.setItem("profile", JSON.stringify(profile)),

    clear: () => localStorage.clear(),
};
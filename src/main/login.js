import { apiFetch } from "../api/http.js";
import { store } from "../state/store.js";

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");

  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    const loginRes = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const user = loginRes?.data;
    if (!user?.accessToken) throw new Error("No access token in response");

    store.setToken(user.accessToken);
    store.setProfile(user);

    if (!store.apiKey()) {
      const keyRes = await apiFetch("/auth/create-api-key", {
        method: "POST",
        body: JSON.stringify({ name: "frontend" }),
      });
      const apiKey = keyRes?.data?.key;
      if (apiKey) store.setApiKey(apiKey);
    }

    window.location.href = "./feed.html";
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || "Login Failed";
    errorEl.classList.remove("hidden");
  }
});

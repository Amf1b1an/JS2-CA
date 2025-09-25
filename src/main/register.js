import { apiFetch } from "../api/http.js";

const form = document.getElementById("registerForm");
const errorEl = document.getElementById("registerError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");

  const fd = new FormData(form);
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const avatar = form.avatar.value.trim();

  

  const payload = { name, email, password, ...(avatar ? { avatar } : {}) };
  console.log("Register payload actually sent:", payload);




    try {
        const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        });
        alert(`Registration successful! Welcome, ${res?.data?.name || name}.`);
        location.href = "./login.html";
    } catch (err) {
        const msg = /Profile already exists/i.test(err.message)
        ? "That username is taken. Please choose another."
        : err.message || "Registration failed.";
        showErr(msg);
    }
    });

    function showErr(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    }

import { store } from "../state/store.js";
import { getPost } from "../api/posts.js";
import { toUrl } from "../utils/media.js";


if (!store.token()) {
  location.href = "./login.html";
}

const postEl = document.getElementById("postContainer");
const errEl = document.getElementById("postError");

function showErr(msg) {
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  } else {
    console.error("POST ERROR:", msg);
    alert(msg);
  }
}
function hideErr() {
  if (errEl) errEl.classList.add("hidden");
}
function fmtDate(iso) {
    try { return new Date(iso).tolovaleString(); } catch { return iso || ""; }
}

// Read id 
const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!id) {
    postEl.innerHTML = "";
    showErr("Missing post id.");
} else {
    load();
} 

async function load() {
    hideErr();
    postEl.textContent = "Loading...";
    try {
        const p = await getPost(id);
        if (!p) {
            postEl.innerHTML = "";
            showErr("Post not found.");
            return;
        }

        postEl.innerHTML = "";

        const h2 = document.createElement("h2");
        h2.textContent = p.title || "(untitled)";
        postEl.appendChild(h2);

        if (p.media) {
            const img = document.createElement("img");
            img.src = p.media;
            img.alt = "";
            img.style = "max-width:100%;border-radius:12px;margin:6px 0";
            postEl.appendChild(img);
        }

        if (p.body) {
            const bodyP = document.createElement("p");
            bodyP.textContent = p.body;
            postEl.appendChild(bodyP);
        }

        const meta = document.createElement("p");
        meta.className = "badge";
        const author = p.author?.name || "unknown";
        meta.textContent = `By ${author} • ${fmtDate(p.created)}${p.updated ? ` • updated ${fmtDate(p.updated)}` : ""}`;
        postEl.appendChild(meta);

        const tags = Array.isArray(p.tags) ? p.tags : [];
        if (tags.length) {
            const tg = document.createElement("p");
            tg.className = "badge";
            tg.textContent = `#${tags.join(" #")}`;
            postEl.appendChild(tg);
        }

        const counts = document.createElement("p");
        counts.className = "badge";
        const cCount = Array.isArray(p.comments) ? p.comments.length : (p._count?.comments ?? 0);
        const rCount = Array.isArray(p.reactions) ? p.reactions.length : (p._count?.reactions ?? 0);
        counts.textContent = `${cCount} comment(s) • ${rCount} reaction(s)`;
        postEl.appendChild(counts);

    }   catch (e) {
        console.error(e);
        postEl.innerHTML = "";
        showErr(e.message || "Failed to load post");
        if (/unauthorized|invalid token/i.test(e.message || "")) {
            store.clear();
            location.href = "./login.html";
        }
    }
}
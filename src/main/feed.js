import { store } from "../state/store.js";
import { getPosts, createPost, updatePost, deletePost } from "../api/posts.js";

if (!store.token()) {
    location.href = "./login.html";
}

const feedEl = document.getElementById("feed");
const feedError = document.getElementById("feedError");
const createForm = document.getElementById("createPostForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearSearchBtn");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    store.clear();
    location.href = "./login.html";
});

let page = 1;
let q = "";

function showError(msg){
    feedError.textContent = msg;
    feedError.classList.remove("hidden");
}
function hideError() {
    feedError.classList.add("hidden");
}

async function load () {
    hideError();
    feedEl.textContent = "Loading...";
    try {
        const { items } = await getPosts({ page, limit: 20, q });
        renderFeed(items);
        pageInfo.textContent = `Page ${page}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = items.length === 0;
    } catch (e) {
        console.error(e);
        feedE1.textContent = "",
        showError(e.message || "Failed to load feed");

        if (/unauthorized|invalid token/i.test(e.message || "")) {
            store.clear();
            location.href = "./login.html"
        }
    }
}

function renderFeed(items) {
    feedEl.innerHTML = "";
    if (!items.length) {
        feedEl.append(child("p", "No posts."));
        return;
    }
    for (const p of items) {
        const isMine = (p?.author?.name && store.profile()?.name === p.author.name);
        const card = document.createElement("div");
        card.className = "post";

        const titleA = document.createElement ("a");
        titleA.href = `./post.html?id=${encodeURIComponent(p.id)}`;
        const h3 = document.createElement("h3");
        h3.textContent = p.title;
        titleA.appendChild(h3);
        card.appendChild(titleA);

        if (p.media) {
            const img = document.createElement("img")
            img.src = p.media;
            img.alt = "";
            img.style = "max-width:100%;border-radius:12px;margin:6px 0";
            card.appendChild(img);
        }

        if (p.body) {
            const bodyP = document.createElement("p");
            bodyP.textContent = p.body;
            card.appendChild(bodyP);
        }

        const row = document.createElement("div");
        row.className = "row";
        const tags = document.createElement("span");
        tags.className = "badge";
        tags.textContent = (p.tags && p.tags.length) ? "#" + p.tags.join("#") : "#";
        row.appendChild(tags);

        const authorBtn = document.createElement("a")
        authorBtn.className = "button";
        authorBtn.href = `./profile.html?name=${encodeURIComponent(p.author?.name || "")}`;
        authorBtn.textContent = p.author?.name || "author";
        row.appendChild(authorBtn);

        card.appendChild(row);

        if (isMine) {
            const actions = document.createElement("div");
            actions.className = "row";

            const editBtn = document.createElement("button");
            editBtn.className = "button";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => onEdit(p));
            actions.appendChild(editBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "button";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", () => onDelete(p.id));
            actions.appendChild(delBtn);

            card.appendChild(action);
        }

        feedEl.appendChild(card);
    }
}

function child(tag, text) {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
}

async function onDelete(id) {
    if (!confirm("Delete this post?")) return;
    try {
        await deletePost(id);
        await load();
    } catch (e) {
        console.error(e);
        showError(e.message || "Failed to delete");
    }
}

async function onEdit(p) {
    const title = prompt("Edit title", p.title);
    if (title === null) return; // cancelled
    const body = prompt("Edit body", p.body || "") ?? "";
    try {
        await updatePost(p.id, { title, body });
        await load();
    } catch (e) {
        console.error(e);
        showError(e.message || "Failed to update");
    }
}

createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(createForm);
    const title = (fd.get("title") || "").toString().trim();
    const body = (fd.get("body") || "").toString();
    const media = (fd.get("media") || "").toString().trim();
    const tags = ((fd.get("tags") || "").toString().split(",").map(t => t.trim()).filter(Boolean));

    if (!title) return showError("Title is required");

    try {
        await createPost({ title, body, media, tags });
        createForm.reset();
        await load();
    } catch (e2) {
        console.error(e2);
        showError(e2.message || "Failed to create post");
    }
});

searchBtn.addEventListener("click", () => {
    q = searchInput.value.trim();
    page = 1;
    load();
});

clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    q = "";
    page = 1;
    load();
});

prevBtn.addEventListener("click", () => {
    if (page > 1) { page--; load(); }
});

nextBtn.addEventListener("click", () => {
    page++;
    load();
});

load();
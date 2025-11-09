import { store } from "../state/store.js";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  reactToPost,
} from "../api/posts.js";
import { toUrl } from "../utils/media.js";

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

const profileBtn = document.getElementById("profileBtn");
profileBtn?.addEventListener("click", () => {
  const me = store.profile()?.name;
  location.href = me
    ? `./profile.html?name=${encodeURIComponent(me)}`
    : "./login.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  store.clear();
  location.href = "./login.html";
});

let page = 1;
let q = "";

function showError(msg) {
  feedError.textContent = msg;
  feedError.classList.remove("hidden");
}
function hideError() {
  feedError.classList.add("hidden");
}

const UP = "👍";
const DOWN = "👎";
const VKEY = "votes-local";

const readVotes = () => {
  try {
    return JSON.parse(localStorage.getItem(VKEY) || "{}");
  } catch {
    return {};
  }
};
const writeVotes = (v) => localStorage.setItem(VKEY, JSON.stringify(v));
const getVote = (postId) => readVotes()[postId] || null;
const setVote = (postId, val) => {
  const v = readVotes();
  if (val) v[postId] = val;
  else delete v[postId];
  writeVotes(v);
};

const countSymbol = (arr, sym) => {
  if (!Array.isArray(arr)) return 0;
  const hit = arr.find((r) => (typeof r === "string" ? r : r.symbol) === sym);
  return hit ? hit.count ?? (typeof hit === "string" ? 1 : 0) : 0;
};

function makeVoteBar(p) {
  const wrap = document.createElement("div");
  wrap.className = "vote";

  const up = document.createElement("button");
  up.className = "btn btn-primary btn-outline-info text-light";
  up.textContent = "▲";
  const down = document.createElement("button");
  down.className = "btn btn-primary btn-outline-info text-light";
  down.textContent = "▼";
  const score = document.createElement("div");
  score.className = "score";

  const refreshUI = () => {
    const ups = countSymbol(p.reactions, UP);
    const downs = countSymbol(p.reactions, DOWN);
    score.textContent = String(ups - downs);
    const mine = getVote(p.id);
    up.classList.toggle("active", mine === "up");
    down.classList.toggle("active", mine === "down");
  };

  const vote = async (dir) => {
    const mine = getVote(p.id);
    try {
      if (mine === dir) {
        await reactToPost(p.id, dir === "up" ? UP : DOWN);
        setVote(p.id, null);
      } else {
        if (mine) {
          try {
            await reactToPost(p.id, mine === "up" ? UP : DOWN);
          } catch {}
        }
        await reactToPost(p.id, dir === "up" ? UP : DOWN);
        setVote(p.id, dir);
      }
      await load();
    } catch (e) {
      console.error(e);
      showError(e.message || "Failed to vote");
    }
  };

  up.addEventListener("click", () => vote("up"));
  down.addEventListener("click", () => vote("down"));

  wrap.append(up, score, down);
  refreshUI();
  return wrap;
}

/**
 * Structure for the feed
 * 20 renderFeed(items) per page
 */

async function load() {
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
    feedEl.textContent = "";
    showError(e.message || "Failed to load feed");

    if (/unauthorized|invalid token/i.test(e.message || "")) {
      store.clear();
      location.href = "./login.html";
    }
  }
}

/**
 * Structure of the renderFeed(items)
 *  item spot
 *    - author
 *    - vertical vote bar
 *    - post
 *  item
 *    - title
 *    - media
 *    - body
 *    - tags
 *    - author
 *
 *    my own item, add
 *    - edit button
 *    - delete button
 *    after author
 *
 * @param {*PostSummary[]} items
 * @returns {void}
 */

function renderFeed(items) {
  feedEl.innerHTML = "";
  if (!items.length) {
    feedEl.append(child("p", "No posts."));
    return;
  }

  for (const p of items) {
    const isMine = p?.author?.name && store.profile()?.name === p.author.name;

    const rowWrap = document.createElement("div");
    rowWrap.className = "p-2";

    const voteBar = makeVoteBar(p);

    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm bg-secondary border border-info p-3";

    // title
    const titleA = document.createElement("a");
    if (p?.id != null)
      titleA.href = `./post.html?id=${encodeURIComponent(p.id)}`;
    titleA.className = "text-decoration-none text-success";
    const h3 = document.createElement("h3");
    h3.className = "card-title mt-3 px-3";
    h3.textContent = p.title || "(untitled)";
    titleA.appendChild(h3);
    card.appendChild(titleA);

    // media
    const url = toUrl(Array.isArray(p.media) ? p.media[0] : p.media);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.className = "card-img-top rounded";
      card.appendChild(img);
    }

    // body
    if (p.body) {
      const bodyP = document.createElement("p");
      bodyP.className = "card-text p-3 text-light";
      bodyP.textContent = p.body;
      card.appendChild(bodyP);
    }

    // tags + author
    const row = document.createElement("div");
    row.className =
      "d-flex flex-column justify-content-between align-items-center px-3 pb-3 gap-2";

    const tags = document.createElement("span");
    tags.className = "badge bg-info";
    tags.textContent = p.tags?.length ? `#${p.tags.join(" #")}` : "#";
    row.appendChild(tags);

    const authorBtn = document.createElement("a");
    authorBtn.className =
      "btn btn-lg btn-secondary text-light border border-info w-100 p-2";
    authorBtn.href = `./profile.html?name=${encodeURIComponent(
      p.author?.name || ""
    )}`;
    authorBtn.textContent = p.author?.name || "author";
    row.appendChild(authorBtn);

    card.appendChild(row);

    if (isMine) {
      const actions = document.createElement("div");
      actions.className = "btn btn-lg border border-info w-100 p-2";

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-lg btn-secondary text-light w-100 mb-2";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => onEdit(p));
      actions.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-lg btn-secondary text-light w-100";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => onDelete(p.id));
      actions.appendChild(delBtn);

      card.appendChild(actions);
    }

    const postLayout = document.createElement("div");
    postLayout.className = "d-flex align-items-stretch"; // horizontal layout

    // vote bar styling
    voteBar.classList.add(
      "d-flex",
      "flex-column",
      "align-items-center",
      "justify-content-between",
      "me-3",
      "bg-dark",
      "text-light",
      "p-2",
      "rounded"
    );

    voteBar.style.minWidth = "50px";
    voteBar.style.flexShrink = "0";

    card.classList.add("flex-grow-1");

    postLayout.append(voteBar, card);
    rowWrap.appendChild(postLayout);
    feedEl.appendChild(rowWrap);
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
  const tags = (fd.get("tags") || "")
    .toString()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

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
  if (page > 1) {
    page--;
    load();
  }
});

nextBtn.addEventListener("click", () => {
  page++;
  load();
});

load();

import { store } from "../state/store.js";
import { getPost, reactToPost, addComment, deleteComment } from "../api/posts.js";
import { toUrl } from "../utils/media.js";

if (!store.token()) location.href = "./login.html";

const postEl = document.getElementById("postContainer");
const errEl  = document.getElementById("postError");

function showErr(msg) { if (errEl){ errEl.textContent = msg; errEl.classList.remove("hidden"); } else { alert(msg); } }
function hideErr() { if (errEl) errEl.classList.add("hidden"); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso || ""; } }

const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!id) { postEl.innerHTML = ""; showErr("Missing post id."); }
else { load(); }

async function load() {
  hideErr();
  postEl.textContent = "Loading...";
  try {
    const p = await getPost(id);
    if (!p) { postEl.innerHTML = ""; showErr("Post not found."); return; }

    // Render main post
    postEl.innerHTML = "";
    const h2 = document.createElement("h2");
    h2.textContent = p.title || "(untitled)";
    postEl.appendChild(h2);

    // media (string, {url}, or array)
    let mediaUrl = "";
    if (Array.isArray(p.media) && p.media.length) mediaUrl = toUrl(p.media[0]);
    else mediaUrl = toUrl(p.media);
    if (mediaUrl) {
      const img = document.createElement("img");
      img.src = mediaUrl;
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

    // tags
    const tags = Array.isArray(p.tags) ? p.tags : [];
    if (tags.length) {
      const tg = document.createElement("p");
      tg.className = "badge";
      tg.textContent = `#${tags.join(" #")}`;
      postEl.appendChild(tg);
    }

    // reactions UI
    postEl.appendChild(renderReactions(p));

    // comments UI
    postEl.appendChild(renderComments(p));

  } catch (e) {
    console.error(e);
    postEl.innerHTML = "";
    showErr(e.message || "Failed to load post");
    if (/unauthorized|invalid token/i.test(e.message || "")) {
      store.clear();
      location.href = "./login.html";
    }
  }
}

function renderReactions(p) {
  const wrap = document.createElement("div");
  wrap.className = "row";
  // existing reaction buttons (if API returns aggregated list)
  const existing = Array.isArray(p.reactions) ? p.reactions : [];
  for (const r of existing) {
    const symbol = typeof r === "string" ? r : r.symbol || "";
    const count  = typeof r === "object" && typeof r.count === "number" ? r.count : null;
    if (!symbol) continue;
    const btn = document.createElement("button");
    btn.className = "button";
    btn.textContent = count != null ? `${symbol} ${count}` : symbol;
    btn.title = "React";
    btn.addEventListener("click", () => onReact(symbol));
    wrap.appendChild(btn);
  }

  // free-form react (type any emoji)
  const input = document.createElement("input");
  input.className = "input";
  input.placeholder = "Type an emoji, e.g. 😍";
  input.maxLength = 8;

  const reactBtn = document.createElement("button");
  reactBtn.className = "button primary";
  reactBtn.textContent = "React";
  reactBtn.addEventListener("click", () => {
    const sym = input.value.trim();
    if (!sym) return;
    onReact(sym);
  });

  wrap.appendChild(input);
  wrap.appendChild(reactBtn);
  return wrap;
}

async function onReact(symbol) {
  try {
    await reactToPost(id, symbol);
    await load(); // refresh counts
  } catch (e) {
    console.error(e);
    showErr(e.message || "Failed to react");
  }
}

function renderComments(p) {
  const section = document.createElement("div");
  section.className = "card";
  const h3 = document.createElement("h3");
  h3.textContent = "Comments";
  section.appendChild(h3);

  const list = document.createElement("div");
  section.appendChild(list);

  const comments = Array.isArray(p.comments) ? [...p.comments] : [];
  comments.sort((a,b) => new Date(a.created) - new Date(b.created));

  // comment composer state
  let replyToId = null;

  const me = store.profile()?.name;

  for (const c of comments) {
    const item = document.createElement("div");
    item.className = "post";

    const meta = document.createElement("p");
    meta.className = "badge";
    meta.textContent = `${c.author?.name || c.owner || "unknown"} • ${fmtDate(c.created)}${c.replyToId ? " • reply" : ""}`;
    item.appendChild(meta);

    const body = document.createElement("p");
    body.textContent = c.body || "";
    item.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "row";

    const replyBtn = document.createElement("button");
    replyBtn.className = "button";
    replyBtn.textContent = "Reply";
    replyBtn.addEventListener("click", () => {
      replyToId = c.id;
      input.placeholder = `Replying to ${c.author?.name || "comment"}…`;
      cancelReplyBtn.classList.remove("hidden");
      input.focus();
    });
    actions.appendChild(replyBtn);

    const isMine = (c.author?.name && c.author.name === me) || (c.owner && c.owner === me);
    if (isMine) {
      const delBtn = document.createElement("button");
      delBtn.className = "button";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this comment? This will also delete its replies.")) return;
        try { await deleteComment(id, c.id); await load(); }
        catch (e) { console.error(e); showErr(e.message || "Failed to delete comment"); }
      });
      actions.appendChild(delBtn);
    }

    item.appendChild(actions);
    list.appendChild(item);
  }

  // add comment form
  const form = document.createElement("form");
  form.className = "form";

  const input = document.createElement("textarea");
  input.className = "input";
  input.rows = 3;
  input.placeholder = "Write a comment…";

  const cancelReplyBtn = document.createElement("button");
  cancelReplyBtn.type = "button";
  cancelReplyBtn.className = "button hidden";
  cancelReplyBtn.textContent = "Cancel reply";
  cancelReplyBtn.addEventListener("click", () => {
    replyToId = null;
    input.placeholder = "Write a comment…";
    cancelReplyBtn.classList.add("hidden");
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button primary";
  submit.textContent = "Post comment";

  form.append(input, cancelReplyBtn, submit);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    try {
      await addComment(id, { body, replyToId });
      input.value = "";
      cancelReplyBtn.click(); // reset reply
      await load();
    } catch (e2) {
      console.error(e2);
      showErr(e2.message || "Failed to add comment");
    }
  });

  section.appendChild(form);
  return section;
}

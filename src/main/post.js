import { store } from "../state/store.js";
import { getPost, reactToPost, addComment, deleteComment } from "../api/posts.js";
import { toUrl } from "../utils/media.js";

if (!store.token()) location.href = "./login.html";

const postEl = document.getElementById("postContainer");
const errEl  = document.getElementById("postError");

function showErr(msg) { if (errEl){ errEl.textContent = msg; errEl.classList.remove("hidden"); } else { alert(msg); } }
function hideErr() { if (errEl) errEl.classList.add("hidden"); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso || ""; } }

const UP = "👍";
const DOWN = "👎";
const VKEY = "votes-local";
const readVotes = () => { try { return JSON.parse(localStorage.getItem(VKEY) || "{}"); } catch { return {}; } };
const writeVotes = (v) => localStorage.setItem(VKEY, JSON.stringify(v));
const getVote = (postId) => readVotes()[postId] || null;
const setVote = (postId, val) => { const v = readVotes(); if (val) v[postId] = val; else delete v[postId]; writeVotes(v); };
const countSymbol = (arr, sym) => {
  if (!Array.isArray(arr)) return 0;
  const hit = arr.find(r => (typeof r === "string" ? r : r.symbol) === sym);
  return hit ? (hit.count ?? (typeof hit === "string" ? 1 : 0)) : 0;
};

function aggregateReactions(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const map = new Map ();
  for (const r of list){
    const symbol = typeof r === "string" ? r : (r?.symbol || "");
    if (!symbol) continue;
    const count = typeof r === "object" && typeof r.count === "number" ? r.count : 1;
    map.set(symbol, (map.get(symbol) || 0) + count);
  }
  return [...map.entries()]
    .map(([symbol, count]) => ({symbol, count}))
    .sort((a, b) => b.count - a.count);
}

/**
 * -Up/downBtn toggles the users vote, where score is the total value.
 * -The Reaction tray is my attempt on creating a clean and nice area for the reactions. It will show the top four reactions, and if the post recieves more then 4 different reactions,
 * it will show a collapsible button that will display all the reactions. one click on each chip will add one more of the same reaction, the plus sign lets you add a new reaction. 
 * @param {Post} p - post to render voting UI
 * @returns {HTMLDivElement} 
 */

function renderVoteInline(p) {
  const wrap = document.createElement("div");
  wrap.className = "vote-inline";

  // --- vote buttons + amount 
  const upBtn = document.createElement("button");
  upBtn.className = "vote-btn";
  upBtn.type = "button";
  upBtn.textContent = UP;
  upBtn.ariaLabel = "Upvote";

  const score = document.createElement("span");
  score.className = "score";

  const downBtn = document.createElement("button");
  downBtn.className = "vote-btn";
  downBtn.type = "button";
  downBtn.textContent = DOWN;
  downBtn.ariaLabel = "Downvote";

  const refreshScoreUI = () => {
    const ups = countSymbol(p.reactions, UP);
    const downs = countSymbol(p.reactions, DOWN);
    score.textContent = String(ups - downs);
    const mine = getVote(p.id);
    upBtn.classList.toggle("active", mine === "up");
    downBtn.classList.toggle("active", mine === "down");
  };

  const vote = async (dir) => {
    const mine = getVote(p.id);
    upBtn.disabled = downBtn.disabled = true;
    try {
      if (mine === dir) {
        await reactToPost(p.id, dir === "up" ? UP : DOWN);
        setVote(p.id, null);
      } else {
        if (mine) { try { await reactToPost(p.id, mine === "up" ? UP : DOWN); } catch {} }
        await reactToPost(p.id, dir === "up" ? UP : DOWN);
        setVote(p.id, dir);
      }
      await load();
    } catch (e) {
      console.error(e);
      showErr(e.message || "Failed to vote");
    } finally {
      upBtn.disabled = downBtn.disabled = false;
    }
  };

  upBtn.addEventListener("click", () => vote("up"));
  downBtn.addEventListener("click", () => vote("down"));

  // --- reactions area ---
  let expanded = false;
  const tray = document.createElement("div");
  tray.className = "rx-tray";

  function renderTray() {
    tray.innerHTML = "";
    const agg = aggregateReactions(p.reactions);
    const visible = expanded ? agg : agg.slice(0, 4);

    for (const r of visible) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = `${r.symbol} ${r.count}`;
      chip.title = `React with ${r.symbol}`;
      chip.addEventListener("click", async (e) => {
        e.stopPropagation(); 
        try { await reactToPost(p.id, r.symbol); await load(); }
        catch (err) { console.error(err); showErr(err.message || "Failed to react"); }
      });
      tray.appendChild(chip);
    }

    if (!expanded && agg.length > 4) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "chip rx-ellipsis";
      more.textContent = "…";
      more.title = `Show all ${agg.length} reactions`;
      tray.appendChild(more);
    }
  }
  tray.addEventListener("click", () => { expanded = !expanded; renderTray(); });

  const addBtn = document.createElement("button");
  addBtn.className = "icon-btn";
  addBtn.type = "button";
  addBtn.title = "Add reaction";
  addBtn.textContent = "➕";
  addBtn.addEventListener("click", async (e) => {
    e.stopPropagation(); 
    const sym = (prompt("React with emoji (e.g. 😍):") || "").trim();
    if (!sym) return;
    try { await reactToPost(p.id, sym); await load(); }
    catch (err) { console.error(err); showErr(err.message || "Failed to react"); }
  });

  wrap.append(upBtn, score, downBtn, addBtn, tray);
  refreshScoreUI();
  renderTray();
  return wrap;
}

/**Post creation and order */
 
const params = new URLSearchParams(location.search);
const id = params.get("id");
if (!id) { postEl.innerHTML = ""; showErr("Missing post id."); } else { load(); }

/** 
 * structure 
 *  - content
 *    - title
 *    - media
 *    - inline voting
 *    - body text
 *    - badge / author and dates
 *    - tags
 *  error handling
 * 
 * @param {load}
 * @returns {Promise<void>}
 * 
 * */
async function load() {
  hideErr();
  postEl.textContent = "Loading...";
  try {
    const p = await getPost(id);
    if (!p) { postEl.innerHTML = ""; showErr("Post not found."); return; }

    postEl.innerHTML = "";


    const content = document.createElement("div");

    const h2 = document.createElement("h2");
    h2.textContent = p.title || "(untitled)";
    content.appendChild(h2);

    let mediaUrl = "";
    if (Array.isArray(p.media) && p.media.length) mediaUrl = toUrl(p.media[0]);
    else mediaUrl = toUrl(p.media);
    if (mediaUrl) {
      const img = document.createElement("img");
      img.src = mediaUrl;
      img.alt = "";
      img.style = "max-width:100%;border-radius:12px;margin:6px 0";
      content.appendChild(img);
    }

    content.appendChild(renderVoteInline(p));

    if (p.body) {
      const bodyP = document.createElement("p");
      bodyP.textContent = p.body;
      content.appendChild(bodyP);
    }

    const meta = document.createElement("p");
    meta.className = "badge";
    const author = p.author?.name || "unknown";
    meta.textContent = `By ${author} • ${fmtDate(p.created)}${p.updated ? ` • updated ${fmtDate(p.updated)}` : ""}`;
    content.appendChild(meta);

    const tags = Array.isArray(p.tags) ? p.tags : [];
    if (tags.length) {
      const tg = document.createElement("p");
      tg.className = "badge";
      tg.textContent = `#${tags.join(" #")}`;
      content.appendChild(tg);
    }

    
    postEl.appendChild(content);

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


// kommentarfelt - comments
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
      cancelReplyBtn.click();
      await load();
    } catch (e2) {
      console.error(e2);
      showErr(e2.message || "Failed to add comment");
    }
  });

  section.appendChild(form);
  return section;
}

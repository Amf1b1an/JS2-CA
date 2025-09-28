import { store } from "../state/store.js";
import { getProfile, getProfilePosts, toggleFollow, updateProfileMedia } from "../api/profiles.js";
import { toUrl } from "../utils/media.js";

/** Auth guard 
 * 
 * checks if the auth token exists. 
 * If not, the user will be returned to login.html
*/
if (!store.token()) location.href = "./login.html";

const box = document.getElementById("profileBox");
const postsEl = document.getElementById("userPosts");
const errEl = document.getElementById("profileError");

document.getElementById("backBtn")?.addEventListener("click", () => {
  location.href = "./feed.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  store.clear();
  location.href = "./login.html";
});

const meName = store.profile()?.name || "";
const qs = new URLSearchParams(location.search);
const viewing = qs.get("name") || meName;

function showErr(msg) {
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  } else {
    console.error(msg);
    alert(msg);
  }
}
function hideErr() { if (errEl) errEl.classList.add("hidden"); }
function fmt(n) { return typeof n === "number" ? n : 0; }
function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso || ""; } }

if (!viewing) {
  box.innerHTML = "";
  postsEl.innerHTML = "";
  showErr("No profile selected");
} else {
  load();
}

async function load() {
  hideErr();
  box.textContent = "Loading profile...";
  postsEl.textContent = "Loading posts...";

  try {
    const [profile, posts] = await Promise.all([
      getProfile(viewing, true),
      getProfilePosts(viewing, { page: 1, limit: 20 }),
    ]);
    renderProfile(profile);
    renderPosts(posts);
  } catch (e) {
    console.error(e);
    box.innerHTML = "";
    postsEl.innerHTML = "";
    showErr(e.message || "Failed to load profile");
    if (/unauthorized|invalid token/i.test(e.message || "")) {
      store.clear();
      location.href = "./login.html";
    }
  }
}

/**Profile Rendering
 * the structure of the profile view
 *  - banner image
 *  - profile picture and name
 *  - three counters for followers following, and post counts
 *  - (OWN PROFILE) update profile form
 *  - (OTHER PROFILES) Follow and unfollow buttons
 * 
 * 
 * 
 * 
 * @param {profile} p - profile data
 * @returns {void}
 */

function renderProfile(p) {
  box.innerHTML = "";

  const bannerUrl = toUrl(p.banner);
  if (bannerUrl) {
    const b = document.createElement("div");
    b.style = "border-radius:12px;overflow:hidden;margin-bottom:8px;border:1px solid #1f2937";
    const img = document.createElement("img");
    img.src = bannerUrl;
    img.alt = "";
    img.style = "width:100%;max-height:220px;object-fit:cover;display:block";
    b.appendChild(img);
    box.appendChild(b);
  }

  const row = document.createElement("div");
  row.className = "row";

  const avatarImg = document.createElement("img");
  const avatarUrl = toUrl(p.avatar);
  if (avatarUrl) avatarImg.src = avatarUrl;
  avatarImg.alt = "";
  avatarImg.style = "height:72px;width:72px;border-radius:50%;object-fit:cover;border:1px solid #374151";
  row.appendChild(avatarImg);

  const info = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = p.name;
  info.appendChild(h2);

  const counts = document.createElement("p");
  counts.className = "badge";
  const fwers = p._count?.followers ?? (p.followers?.length ?? 0);
  const fwing = p._count?.following ?? (p.following?.length ?? 0);
  const postCount = p._count?.posts ?? (Array.isArray(p.posts) ? p.posts.length : 0);
  counts.textContent = `${fmt(fwers)} followers • ${fmt(fwing)} following • ${fmt(postCount)} posts`;
  info.appendChild(counts);

  const meta = document.createElement("p");
  meta.className = "badge";
  meta.textContent = p.updated ? `Updated ${fmtDate(p.updated)}` : "";
  info.appendChild(meta);

  row.appendChild(info);
  box.appendChild(row);

  if (viewing && meName && viewing !== meName) {
    const youFollow = !!(p.followers || []).find(f => f.name === meName);
    const btn = document.createElement("button");
    btn.className = "button primary";
    btn.textContent = youFollow ? "Unfollow" : "Follow";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await toggleFollow(p.name, youFollow ? "unfollow" : "follow");
        await load();
      } catch (e) {
        console.error(e);
        showErr(e.message || "Failed to update follow");
        btn.disabled = false;
      }
    });
    box.appendChild(btn);
  }

  if (viewing === meName) {
    const hr = document.createElement("hr");
    box.appendChild(hr);

    const form = document.createElement("form");
    form.className = "form";


    const r3 = document.createElement("div");
    r3.className = "row";
    const btn = document.createElement("button");
    btn.className = "button primary";
    btn.type = "submit";
    btn.textContent = "Update Media";
    r3.appendChild(btn);

    form.append(r3);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const avatar = avatarInput.value.trim();
      const banner = bannerInput.value.trim();
      const payload = { name: meName };
      if (avatar) payload.avatar = avatar;
      if (banner) payload.banner = banner;
      try {
        await updateProfileMedia(payload);
        await load();
      } catch (er) {
        console.error(er);
        showErr(er.message || "Failed to update media");
      }
    });

    box.appendChild(form);
  }
}

function renderPosts(items) {
  postsEl.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.textContent = "No posts yet.";
    postsEl.appendChild(p);
    return;
  }

  for (const post of items) {
    const card = document.createElement("div");
    card.className = "post";

    const a = document.createElement("a");
    a.href = `./post.html?id=${encodeURIComponent(post.id)}`;
    const h3 = document.createElement("h3");
    h3.textContent = post.title;
    a.appendChild(h3);
    card.appendChild(a);

   
    let mediaUrl = "";
    if (Array.isArray(post.media) && post.media.length) {
      mediaUrl = toUrl(post.media[0]);
    } else {
      mediaUrl = toUrl(post.media);
    }

    if (mediaUrl) {
      const img = document.createElement("img");
      img.src = mediaUrl;
      img.alt = "";
      img.style = "max-width:100%;border-radius:12px;margin:6px 0";
      card.appendChild(img);
    }

    if (post.body) {
      const body = document.createElement("p");
      body.textContent = post.body;
      card.appendChild(body);
    }

    postsEl.appendChild(card);
  }
}

// ======================== mission.js (no-flicker, full) ========================
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const playerName = sessionStorage.getItem("playerName");

const choicePanel = document.getElementById("mission-choice-panel");
const waitingPanel = document.getElementById("waiting-panel");
const successBtn = document.getElementById("success-btn");
const failBtn = document.getElementById("fail-btn");
const confirmBtn = document.getElementById("confirm-btn");

let selectedCard = null;
let expedition = [];

/* ---------- 角色鍵清單 & 關聯影格（用於預載） ---------- */
// 要與 mission.css 中 [data-role="..."] 對齊
const ROLE_KEYS = [
  "engineer", "medic", "commander",
  "civilian-good", "saboteur", "civilian-bad",
  "shadow", "lurker"
];

// 各職業動畫會用到的圖片（依你 CSS 的 keyframes）
const ROLE_FRAMES = {
  "engineer":      ["/images/21.png","/images/22.png","/images/23.png","/images/24.png"],
  "medic":         ["/images/31.png","/images/32.png","/images/33.png","/images/34.png"],
  "commander":     ["/images/41.png","/images/42.png","/images/43.png","/images/44.png"],
  "civilian-good": ["/images/51.png","/images/52.png","/images/53.png"],
  "saboteur":      ["/images/61.png","/images/62.png"],
  "civilian-bad":  ["/images/71.png","/images/72.png"],
  "shadow":        ["/images/81.png","/images/82.png"],
  "lurker":        ["/images/11.png","/images/12.png","/images/13.png","/images/14.png"]
};

// 簡單的預載器
const _imgLoaded = new Set();
function preloadOne(src) {
  return new Promise(res => {
    if (_imgLoaded.has(src)) return res();
    const im = new Image();
    im.onload = () => { _imgLoaded.add(src); res(); };
    im.onerror = () => res();
    im.src = src;
  });
}
async function preloadRole(role) {
  const frames = ROLE_FRAMES[role] || [];
  for (const src of frames) await preloadOne(src);
}
async function preloadAllRoles() {
  for (const r of ROLE_KEYS) await preloadRole(r);
}

function normalizeRoleKey(name) {
  const map = {
    "偵查官": "engineer",
    "醫護兵": "medic",
    "破壞者": "saboteur",
    "影武者": "shadow",
    "潛伏者": "lurker",
    "指揮官": "commander",
    "普通倖存者": "civilian-good",
    "邪惡平民": "civilian-bad"
  };
  return map[name] || String(name || "").trim().toLowerCase();
}

function pickRandomOtherRole(current) {
  const pool = ROLE_KEYS.filter(r => r !== current);
  return pool[Math.floor(Math.random() * pool.length)] || current;
}

/* ---------- 兜底取得我的角色並設定動畫 ---------- */
async function ensureMyRoleFromServer() {
  let role = localStorage.getItem("myRole");
  if (role && role.trim()) return role;

  try {
    const res = await fetch(`/api/room/${roomId}/roles`);
    if (!res.ok) throw new Error("roles api not ok");
    const { assignedRoles } = await res.json();
    if (assignedRoles && playerName && assignedRoles[playerName]) {
      role = assignedRoles[playerName].name || assignedRoles[playerName];
      if (role) {
        localStorage.setItem("myRole", role);
        return role;
      }
    }
  } catch (e) {
    console.warn("ensureMyRoleFromServer failed:", e);
  }
  return null;
}

async function setWaitAnimRole() {
  const roleAnim = document.getElementById("role-wait-anim");
  if (!roleAnim) return;

  let myRole = localStorage.getItem("myRole") || sessionStorage.getItem("myRole") || urlParams.get("role");
  if (!myRole || !myRole.trim()) {
    myRole = await ensureMyRoleFromServer();
  }
  const key = normalizeRoleKey(myRole || "civilian-good");

  // 先預載，避免初次出現就閃
  await preloadRole(key);

  // 平滑切換（暫停動畫 → 換 role → 恢復動畫）
  // 加超短 opacity 過渡，肉眼看起來更穩
  smoothSwapRole(roleAnim, key);
}

/* ---------- 平滑切換角色，避免閃爍 ---------- */
function pauseAnimation(el) {
  // 暫停並強制重排，再恢復可讓 keyframes 從第一幀穩定開始
  el.style.animation = "none";
  // 強制重排
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
}
function resumeAnimation(el) {
  el.style.animation = "";
}
function shortFade(el, then) {
  el.style.transition = "opacity .12s ease";
  el.style.opacity = "0.85";
  requestAnimationFrame(() => {
    try { then(); } finally {
      // 下一個 frame 再淡回
      requestAnimationFrame(() => { el.style.opacity = "1"; });
    }
  });
}

function smoothSwapRole(el, nextKey) {
  pauseAnimation(el);
  shortFade(el, () => {
    el.setAttribute("data-role", nextKey);
    resumeAnimation(el);
  });
}

/* ---------- 點擊動圖 → 隨機換其他職業（含預載與平滑切換） ---------- */
function enableRandomRoleOnClick() {
  const el = document.getElementById("role-wait-anim");
  if (!el) return;
  if (el._randomRoleBound) return;
  el._randomRoleBound = true;

  el.addEventListener("click", async () => {
    const cur = el.getAttribute("data-role") || "civilian-good";
    const next = pickRandomOtherRole(cur);
    await preloadRole(next);          // 確保新角色影格已在快取
    smoothSwapRole(el, next);         // 平滑切換，避免閃
  });
}

/* ---------- 出戰名單 ---------- */
async function fetchExpedition() {
  try {
    const res = await fetch(`/api/room/${roomId}/vote-state?player=${encodeURIComponent(playerName)}`);
    const data = await res.json();
    expedition = data.expedition || [];

    if (expedition.includes(playerName)) {
      choicePanel.classList.remove("hidden");
      waitingPanel.classList.add("hidden");
    } else {
      waitingPanel.classList.remove("hidden");
      choicePanel.classList.add("hidden");

      await setWaitAnimRole();   // 設定等待動圖角色（含預載和平滑）
      enableRandomRoleOnClick();

      showRandomNote();
      scheduleNextNote();
    }
  } catch (err) {
    alert("❌ 無法取得出戰名單");
    console.error(err);
  }
}

/* ---------- 提交任務卡 ---------- */
successBtn?.addEventListener("click", () => {
  selectedCard = "SUCCESS";
  successBtn.classList.add("selected");
  failBtn.classList.remove("selected");
  confirmBtn.disabled = false;
});
failBtn?.addEventListener("click", () => {
  selectedCard = "FAIL";
  failBtn.classList.add("selected");
  successBtn.classList.remove("selected");
  confirmBtn.disabled = false;
});
confirmBtn?.addEventListener("click", async () => {
  if (!selectedCard) return;
  successBtn.disabled = true;
  failBtn.disabled = true;
  confirmBtn.disabled = true;
  confirmBtn.textContent = "已送出";
  try {
    const res = await fetch(`/api/room/${roomId}/mission-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: playerName, result: selectedCard })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    choicePanel.classList.add("hidden");
    waitingPanel.classList.remove("hidden");
      await setWaitAnimRole();
    showRandomNote();
    scheduleNextNote();
  } catch (err) {
    alert("❌ 任務卡送出失敗");
    successBtn.disabled = false;
    failBtn.disabled = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = "確認提交";
  }
});

/* ---------- WebSocket ---------- */
function connectWebSocket() {
  const socket = new SockJS('/ws');
  const stompClient = Stomp.over(socket);
  stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/room/${roomId}`, msg => {
      const body = msg.body.trim();
      if (body === "allMissionCardsSubmitted") {
        window.location.href = `/skill.html?roomId=${roomId}`;
      }
    });
  });
}

/* ---------- 隨機紙條 ---------- */
const paperMessages = [
  "觀察出戰名單，推測誰最可能被針對。",
  "投票前，先在心中列三個可疑名單。",
  "若你是好人：別急著發言，先聽訊息。",
  "若你是壞人：過度解釋是破綻，適度低調。",
  "注意上一回合誰急著帶風向？",
  "偵查官數據要記下來，誰可能是關鍵？",
  "有人一直保持沉默，是真低調還是心虛？",
  "投票反覆搖擺的人，可信度要降低。",
  "領袖選擇有沒有偏向？這也可能是線索。",
  "紙條上寫著：『別急著亮身份，時機很重要。』",
  "有些失敗不是意外，而是刻意為之。",
  "觀察誰最急著拉票，這往往是破綻。",
  "真正的好人通常會給出合理但不過度的推理。",
  "過度強調自己清白的人，往往心裡有鬼。",
  "耐心等待，有時候沉默也是一種策略。",
  "數據和直覺要交替使用，不要只靠一邊。",
  "假裝失誤的人，也可能是高手的偽裝。",
  "別忘了：影武者查起來是正義。",
  "醫護兵只會出手一次，別浪費機會。",
  "破壞者技能能拖延局勢，要注意時機。"
];

const noteEl = document.getElementById("paper-note");
const noteTextEl = document.getElementById("paper-content");

function getRandomMessage(exclude) {
  let msg;
  do {
    msg = paperMessages[Math.floor(Math.random() * paperMessages.length)];
  } while (msg === exclude && paperMessages.length > 1);
  return msg;
}

function showRandomNote() {
  if (!noteEl || !noteTextEl) return;
  const current = noteTextEl.textContent;
  const msg = getRandomMessage(current);
  noteTextEl.textContent = msg;
  noteEl.classList.remove("hidden");
  requestAnimationFrame(() => noteEl.classList.add("show"));
}

function scheduleNextNote() {
  const delay = 8000 + Math.random() * 7000;
  setTimeout(() => {
    showRandomNote();
    scheduleNextNote();
  }, delay);
}

// ✅ 點擊紙條時換另一個隨機文本
noteEl?.addEventListener("click", () => {
  const current = noteTextEl?.textContent || "";
  const msg = getRandomMessage(current);
  if (noteTextEl) noteTextEl.textContent = msg;
});

/* ---------- 初始化 ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // 背景預載全部角色影格，之後切換更穩
  preloadAllRoles();

  await fetchExpedition();   // 等待分支內會 setWaitAnimRole() + 啟用點擊隨機
  // 再保險一次，避免 race condition（例如馬上就在等待頁）
  await setWaitAnimRole();
  enableRandomRoleOnClick();

  connectWebSocket();
});
// ====================== end of mission.js (no-flicker) ======================

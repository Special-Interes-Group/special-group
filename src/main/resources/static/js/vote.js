// -------------------- 基本變數 --------------------
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const playerName = sessionStorage.getItem("playerName");

const agreeCountEl   = document.getElementById("agree-count");
const rejectCountEl  = document.getElementById("reject-count");
const resultBox      = document.getElementById("vote-result");
const btnBox         = document.getElementById("vote-buttons");
const agreeBtn       = document.getElementById("agree-btn");
const rejectBtn      = document.getElementById("reject-btn");
const confirmBtn     = document.getElementById("confirm-btn");
const statusEl       = document.getElementById("status");
const expeditionBox  = document.getElementById("expedition-container");
const countdownEl    = document.getElementById("countdown");

let players = [];
let expedition = [];
let canVote = false;
let hasVoted = false;
let agree = 0;
let reject = 0;
let selectedVote = null;
let stompClient = null;
let countdownTimer = null;
let didNavigate = false;

// 以伺服器為單一真相：快取伺服器曾回傳的最新欄位，用它們來計算與顯示
let serverAgree = 0;
let serverReject = 0;
let serverAbstain = null;       // 若伺服器沒回，保持 null
let serverTotalEligible = null; // 同上
let serverThreshold = null;     // 同上
let serverPassed = null;        // 同上
let serverClosed = null;        // 同上

// -------------------- 工具函式 --------------------
function toInt(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

async function fetchPlayers() {
  const res = await fetch(`/api/room/${roomId}/players`);
  players = await res.json();
}

function getCutoutAvatarPath(originalAvatar) {
  const fileName = (originalAvatar || "").split('/').pop();
  return `cut/${fileName}`;
}

// 依人數設定紙面板版型（配合 CSS）
function applyExpeditionLayoutByCount() {
  const board = document.getElementById('paper-board');
  if (!board) return;
  board.classList.remove('count-2', 'count-3', 'count-4', 'count-5');
  const n = expeditionBox.querySelectorAll('.exp-card').length;
  if (n === 2) board.classList.add('count-2');
  if (n === 3) board.classList.add('count-3');
  if (n === 4) board.classList.add('count-4');
  if (n === 5) board.classList.add('count-5');
}

function renderExpedition(list) {
  expeditionBox.innerHTML = "";
  list.forEach(name => {
    const p = players.find(v => v.name === name);
    if (!p) return;
    const cutoutAvatar = getCutoutAvatarPath(p.avatar);
    expeditionBox.insertAdjacentHTML("beforeend", `
      <div class="exp-card">
        <div class="avatar-wrapper">
          <img src="/images/${cutoutAvatar}" alt="${p.name}">
        </div>
        <div class="exp-name">${p.name}</div>
      </div>
    `);
  });

  // ★ 依人數套用對應版型（count-2 / count-3 / ...）
  applyExpeditionLayoutByCount();
}

function updateUICounts(a, r) {
  agreeCountEl.textContent = a;
  rejectCountEl.textContent = r;
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function disableButtons() {
  agreeBtn.disabled = true;
  rejectBtn.disabled = true;
  confirmBtn.disabled = true;
}

// -------------------- 與後端互動 --------------------
// 注意：棄票要用 abstain:true 明確表示；agree:false 代表「反對」，不是「棄票」
async function sendAbstain() {
  try {
    await fetch(`/api/room/${roomId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter: playerName, abstain: true })
      // 若後端暫不支援，請後端優先判斷 abstain:true；不要用 agree:false 當棄票
    });
    hasVoted = true;
    statusEl.textContent = "逾時未投，已視為棄票。";
  } catch {
    statusEl.textContent = "棄票送出失敗";
  }
}

async function sendVote(value) {
  if (hasVoted) return;
  disableButtons();
  btnBox.classList.add("hidden");
  statusEl.textContent = "送出中...";
  try {
    await fetch(`/api/room/${roomId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter: playerName, agree: !!value })
      // 這裡的 agree:true/false 僅代表同意/反對；不包含棄票
    });
    hasVoted = true;
    statusEl.textContent = "你已完成投票，等待其他玩家...";
    // 不要停止倒數，讓時間到自動結束
  } catch {
    statusEl.textContent = "投票送出失敗";
  }
}

// 統一從伺服器抓結果；若伺服器提供擴充欄位則以之為準
async function getServerResult() {
  const res = await fetch(`/api/room/${roomId}/vote-result`);
  if (!res.ok) throw new Error("vote-result not ok");
  const data = await res.json();

  serverAgree = toInt(data.agree, serverAgree);
  serverReject = toInt(data.reject, serverReject);

  // 伺服器若有提供，優先使用
  serverAbstain = (data.abstain != null) ? toInt(data.abstain, serverAbstain ?? 0) : serverAbstain;
  serverTotalEligible = (data.totalEligible != null) ? toInt(data.totalEligible, serverTotalEligible ?? 0) : serverTotalEligible;
  serverThreshold = (data.threshold != null) ? toInt(data.threshold, serverThreshold ?? 0) : serverThreshold;
  serverPassed = (typeof data.passed === "boolean") ? data.passed : serverPassed;
  serverClosed = (typeof data.closed === "boolean") ? data.closed : serverClosed;

  return {
    agree: serverAgree,
    reject: serverReject,
    abstain: serverAbstain,
    totalEligible: serverTotalEligible,
    threshold: serverThreshold,
    passed: serverPassed,
    closed: serverClosed
  };
}

// -------------------- 決策計算（單一真相） --------------------
function computeDecision(snapshot) {
  // 1) 以伺服器欄位為優先
  const a = toInt(snapshot.agree, 0);
  const r = toInt(snapshot.reject, 0);

  let total = snapshot.totalEligible;
  if (total == null) {
    // 後端未提供 totalEligible 時，退化用初始化時抓到的玩家數
    // 為減少端端差異，若 players 還沒抓到，至少用 a+r 作為下限
    total = players?.length ?? (a + r);
  }

  let abstain = snapshot.abstain;
  if (abstain == null) {
    abstain = Math.max(0, total - (a + r));
  }

  // 門檻：ceil((總人數 - 棄票) / 2)
  let needed = snapshot.threshold;
  if (needed == null) {
    const effective = Math.max(0, total - abstain);
    needed = Math.ceil(effective / 2);
  }

  // 是否通過：若伺服器已給 passed，就尊重；否則用規則算
  const passed = (typeof snapshot.passed === "boolean")
    ? snapshot.passed
    : (a >= needed);

  return { a, r, abstain, total, needed, passed };
}

// -------------------- 顯示與跳轉 --------------------
function showResultAndNavigateFromSnapshot(snapshot) {
  if (didNavigate) return;

  const { a, r, abstain, total, needed, passed } = computeDecision(snapshot);

  // 同步到全域，UI 顯示用
  agree = a; reject = r;
  updateUICounts(agree, reject);

  resultBox.classList.remove("hidden");
  btnBox.classList.add("hidden");

  statusEl.textContent =
    `投票結束（同意：${agree}　反對：${reject}　棄票：${abstain}　門檻：${needed}／有效票數：${total - abstain}）結果：${passed ? "通過" : "失敗"}`;

  didNavigate = true;

  setTimeout(() => {
    if (passed) {
      window.location.href = `/mission.html?roomId=${roomId}`;
    } else {
      sessionStorage.setItem("skipMission", "true");
      window.location.href = `/game-front-page.html?roomId=${roomId}`;
    }
  }, 3000);
}

// 取一次伺服器最終結果並顯示
async function fetchAndShowResult() {
  try {
    const snap = await getServerResult(); // 只要取到一次就以它為準
    showResultAndNavigateFromSnapshot(snap);
  } catch {
    // 若暫時失敗，交由輪詢流程處理
    throw new Error("fetchAndShowResult failed");
  }
}

// -------------------- 倒數與收尾 --------------------
async function onCountdownEnd() {
  try {
    if (!hasVoted) {
      await sendAbstain();  // 明確棄票
    } else {
      // 可選：通知時間到（若後端需要觸發結算）
      try { await fetch(`/api/room/${roomId}/vote-timeup`, { method: "POST" }); } catch {}
    }
  } finally {
    await waitForCanonicalResult(); // 等到能拿到伺服器結果為止（有超時）
  }
}

function startCountdown(seconds = 15) {
  countdownEl.textContent = seconds;
  stopCountdown();
  countdownTimer = setInterval(async () => {
    seconds--;
    countdownEl.textContent = seconds;
    if (seconds <= 0) {
      stopCountdown();
      await onCountdownEnd();
    }
  }, 1000);
}

// 等待伺服器可用的結果（避免用本地舊值做決策）
// 最多等待 4 秒，300ms 一次；若超時，最後一次成功值或顯示提示
async function waitForCanonicalResult(timeoutMs = 4000, intervalMs = 300) {
  const deadline = Date.now() + timeoutMs;
  let lastSnap = null;

  while (Date.now() < deadline && !didNavigate) {
    try {
      const snap = await getServerResult();
      lastSnap = snap;
      const haveAll = (typeof snap.closed === "boolean") ||
                      (typeof snap.passed === "boolean") ||
                      (snap.abstain != null && snap.totalEligible != null);
      if (haveAll) {
        showResultAndNavigateFromSnapshot(snap);
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }

  if (lastSnap) {
    showResultAndNavigateFromSnapshot(lastSnap);
  } else {
    statusEl.textContent = "投票已截止，等待伺服器結算...";
  }
}

// -------------------- 初始化與 WebSocket --------------------
async function init() {
  await fetchPlayers();
  try {
    const res = await fetch(`/api/room/${roomId}/vote-state?player=${encodeURIComponent(playerName)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    // 初始化僅作顯示，不用來最終決策
    agree = toInt(data.agree, 0);
    reject = toInt(data.reject, 0);
    canVote = !!data.canVote;
    hasVoted = !!data.hasVoted;
    expedition = data.expedition || [];

    renderExpedition(expedition);
    updateUICounts(agree, reject);

    if (canVote && !hasVoted) {
      btnBox.classList.remove("hidden");
    }

    startCountdown(15);
  } catch {
    statusEl.textContent = "無法取得投票資訊";
  }
}

function connectWebSocket() {
  const socket = new SockJS('/ws');
  stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    // 若後端有中途更新投票數的訊息（例如 voteUpdate），可在此訂閱刷新畫面
    // 目前只處理最終結果事件
    stompClient.subscribe(`/topic/vote/${roomId}`, async msg => {
      const body = (msg.body || "").trim();
      if (body === "votePassed" || body === "voteFailed") {
        stopCountdown();
        try {
          await fetchAndShowResult();
        } catch {
          await waitForCanonicalResult();
        }
      }
    });
  });
}

// -------------------- 事件 --------------------
agreeBtn.addEventListener("click", () => {
  if (hasVoted) return;
  selectedVote = true;
  agreeBtn.classList.add("selected");
  rejectBtn.classList.remove("selected");
});

rejectBtn.addEventListener("click", () => {
  if (hasVoted) return;
  selectedVote = false;
  rejectBtn.classList.add("selected");
  agreeBtn.classList.remove("selected");
});

confirmBtn.addEventListener("click", () => {
  if (selectedVote === null || hasVoted) {
    alert("請先選擇同意或反對！");
    return;
  }
  sendVote(selectedVote);
});

document.addEventListener("DOMContentLoaded", () => {
  init();
  connectWebSocket();
});

// === 依 background-size: cover 計算紙面矩形在視窗中的實際座標 ===
const BG_NATURAL = { w: 1536, h: 1024 };           // /images/test.png 原圖尺寸
const PAPER_RECT = { x: 480, y: 128, w: 574, h: 576 }; // 中央大紙在原圖中的位置

function layoutPaperBoard() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // cover 規則：用較大縮放讓圖片鋪滿視窗
  const scale = Math.max(vw / BG_NATURAL.w, vh / BG_NATURAL.h);
  const drawW = BG_NATURAL.w * scale;
  const drawH = BG_NATURAL.h * scale;

  // 置中後產生的偏移（可能會左右或上下溢出被裁）
  const offsetX = (vw - drawW) / 2;
  const offsetY = (vh - drawH) / 2;

  // 把原圖座標映射到螢幕像素
  const left   = Math.round(offsetX + PAPER_RECT.x * scale);
  const top    = Math.round(offsetY + PAPER_RECT.y * scale);
  const width  = Math.round(PAPER_RECT.w * scale);
  const height = Math.round(PAPER_RECT.h * scale);

  const board = document.getElementById('paper-board');
  if (!board) return;
  board.style.left = left + 'px';
  board.style.top = top + 'px';
  board.style.width = width + 'px';
  board.style.height = height + 'px';
}

window.addEventListener('resize', layoutPaperBoard);
document.addEventListener('DOMContentLoaded', layoutPaperBoard);

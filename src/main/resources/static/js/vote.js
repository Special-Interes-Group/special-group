const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const playerName = sessionStorage.getItem("playerName");

const agreeCountEl = document.getElementById("agree-count");
const rejectCountEl = document.getElementById("reject-count");
const resultBox = document.getElementById("vote-result");
const btnBox = document.getElementById("vote-buttons");
const agreeBtn = document.getElementById("agree-btn");
const rejectBtn = document.getElementById("reject-btn");
const confirmBtn = document.getElementById("confirm-btn");
const statusEl = document.getElementById("status");
const expeditionBox = document.getElementById("expedition-container");
const countdownEl = document.getElementById("countdown");

let players = [];
let expedition = [];
let canVote = false;
let hasVoted = false;
let agree = 0;
let reject = 0;
let selectedVote = null;
let stompClient = null;
let countdownTimer = null;

async function fetchPlayers() {
  const res = await fetch(`/api/room/${roomId}/players`);
  players = await res.json();
}

// 新增：把原圖檔名轉成 cut 資料夾的路徑
function getCutoutAvatarPath(originalAvatar) {
  // originalAvatar 可能是 "headshot5.png" 或 "avatars/headshot5.png"
  const fileName = originalAvatar.split('/').pop(); // 只取檔名部分
  return `cut/${fileName}`; // 指向 cut 子資料夾
}

function renderExpedition(list) {
  expeditionBox.innerHTML = "";
  list.forEach(name => {
    const p = players.find(v => v.name === name);
    if (!p) return;

    const cutoutAvatar = getCutoutAvatarPath(p.avatar); // 取得去背圖路徑

    expeditionBox.insertAdjacentHTML("beforeend", `
      <div class="exp-card">
        <div class="avatar-wrapper">
          <img src="/images/${cutoutAvatar}" alt="${p.name}">
        </div>
        <div class="exp-name">${p.name}</div>
      </div>
    `);
  });
}


function updateUI() {
  agreeCountEl.textContent = agree;
  rejectCountEl.textContent = reject;
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

async function sendAbstain() {
  try {
    await fetch(`/api/room/${roomId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter: playerName, agree: false })
    });
    hasVoted = true;
    statusEl.textContent = "⏱ 逾時未投，已視為棄票。";
  } catch {
    statusEl.textContent = "❌ 棄票送出失敗";
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
      body: JSON.stringify({ voter: playerName, agree: value })
    });
    hasVoted = true;
    statusEl.textContent = "✅ 你已完成投票，等待其他玩家...";
    stopCountdown();
  } catch {
    statusEl.textContent = "❌ 投票送出失敗";
  }
}

function disableButtons() {
  agreeBtn.disabled = rejectBtn.disabled = confirmBtn.disabled = true;
}

async function fetchAndShowResult() {
  try {
    const res = await fetch(`/api/room/${roomId}/vote-result`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    agree = data.agree;
    reject = data.reject;
    updateUI();
    resultBox.classList.remove("hidden");
    btnBox.classList.add("hidden");

    const passed = agree > reject;
    statusEl.textContent = `投票結束，結果：${passed ? "通過" : "失敗"}`;

    setTimeout(() => {
      if (passed) {
        window.location.href = `/mission.html?roomId=${roomId}`;
      } else {
        sessionStorage.setItem("skipMission", "true");
        window.location.href = `/game-front-page.html?roomId=${roomId}`;
      }
    }, 3000);
  } catch {
    statusEl.textContent = "無法取得投票結果";
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
      if (!hasVoted) {
        await sendAbstain();
      }
    }
  }, 1000);
}

async function init() {
  await fetchPlayers();
  try {
    const res = await fetch(`/api/room/${roomId}/vote-state?player=${encodeURIComponent(playerName)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    agree = data.agree;
    reject = data.reject;
    canVote = data.canVote;
    hasVoted = data.hasVoted;
    expedition = data.expedition || [];
    renderExpedition(expedition);
    updateUI();

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
    stompClient.subscribe(`/topic/vote/${roomId}`, async msg => {
      const body = msg.body.trim();
      if (body === "votePassed" || body === "voteFailed") {
        stopCountdown();
        await fetchAndShowResult();
      }
    });
  });
}

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

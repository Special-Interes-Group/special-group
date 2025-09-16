console.log("room.js loaded");

let pollingInterval = null;
let currentPlayers = [];
let stompClient = null;
const roomId = window.location.pathname.split("/").pop();

/* 旗子素材池 */
const bannerImages = [
  "/images/flag1.png",
  "/images/flag2.png",
  "/images/flag3.png",
  "/images/flag4.png",
  "/images/flag5.png"
];
const bannerAssignments = {}; // playerName -> imagePath

const stageLayout = {
  sign: { top: 33, left: 50, width: 80, height: 65 }, // 🔧 木牌往下移、加大
  banners: [
    { top: 48, left: 20 }, { top: 48, left: 35 },
    { top: 48, left: 50 }, { top: 48, left: 65 },
    { top: 48, left: 80 },
    { top: 76, left: 20 }, { top: 76, left: 35 },
    { top: 76, left: 50 }, { top: 76, left: 65 },
    { top: 76, left: 80 }
  ]
};

function applyPositions() {
  const sign = document.getElementById("sign");
  const s = stageLayout.sign;
  sign.style.top = s.top + "%";
  sign.style.left = s.left + "%";
  sign.style.width = s.width + "vw";
  sign.style.height = s.height + "vh";
  sign.style.transform = "translate(-50%, -50%)";

  stageLayout.banners.forEach((p, i) => {
    const el = document.getElementById(`slot-${i}`);
    if (!el) return;
    el.style.top = p.top + "%";
    el.style.left = p.left + "%";
    el.style.transform = "translate(-50%, -50%)";
  });
}


document.addEventListener("DOMContentLoaded", () => {
  applyPositions();
  loadRoomData();
  setupExitRoomButton();
  document.getElementById("start-game-btn").addEventListener("click", startGame);
  pollingInterval = setInterval(loadRoomData, 3000);
  connectWebSocket();
});
window.addEventListener("resize", applyPositions);

async function loadRoomData() {
  try {
    const res = await fetch(`/api/room/${roomId}`, { cache: "no-cache" });
    if (!res.ok) throw new Error("room api error");
    const room = await res.json();

    // 木牌文字
    document.getElementById("roomId").textContent = `房間 ${room.roomName || roomId}`;
    document.getElementById("host").textContent   = `局主：${room.players?.[0] || "???"}`;

    // 更新旗幟名稱（10 面）
    const players = room.players || [];
    currentPlayers = players;
    for (let i = 0; i < 10; i++) {
      const slot = document.getElementById(`slot-${i}`);
      const name = players[i] || "";

      if (name) {
        if (!bannerAssignments[name]) {
          const randomIndex = Math.floor(Math.random() * bannerImages.length);
          bannerAssignments[name] = bannerImages[randomIndex];
        }
        slot.style.backgroundImage = `url('${bannerAssignments[name]}')`;
      } else {
        slot.style.backgroundImage = "none";
      }

      slot.dataset.player = name ? (name.length > 5 ? name.slice(0, 5) + "…" : name) : "";
    }

    // 開始遊戲按鈕
    const startBtn = document.getElementById("start-game-btn");
    const me = sessionStorage.getItem("playerName");
    if (players.length >= (room.playerCount || 10) && me === players[0]) {
      startBtn.disabled = false;
      startBtn.classList.add("active");
    } else {
      startBtn.disabled = true;
      startBtn.classList.remove("active");
    }
  } catch (e) {
    console.error("加載房間資料失敗:", e);
  }
}

function setupExitRoomButton() {
  document.getElementById("exit-room-btn").addEventListener("click", async () => {
    clearInterval(pollingInterval);
    const playerName = sessionStorage.getItem("playerName");
    if (playerName) {
      try {
        await fetch(`/api/exit-room?roomId=${roomId}&playerName=${encodeURIComponent(playerName)}`, { method: "POST" });
      } catch (_) {}
    }
    window.location.href = "/game-lobby";
  });
}

function startGame() {
  const me = sessionStorage.getItem("playerName");
  if (!currentPlayers.length || me !== currentPlayers[0]) {
    return alert("只有房主可以開始遊戲！");
  }
  fetch(`/api/start-game?roomId=${roomId}&playerName=${encodeURIComponent(me)}`, { method: "POST" }).catch(() => {});
  clearInterval(pollingInterval);
}

function connectWebSocket() {
  const socket = new SockJS('/ws');
  stompClient = Stomp.over(socket);
  stompClient.connect({}, frame => {
    stompClient.subscribe(`/topic/room/${roomId}`, msg => {
      const body = (msg.body || "").trim();
      if (body === "startGame") {
        window.location.href = `/game-start/${roomId}`;
      } else if (body === "refresh") {
        loadRoomData();
      }
    });
  }, err => console.error("WebSocket 錯誤:", err));
}

// mission.js - 任務卡提交控制
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

// 取得目前出戰名單
async function fetchExpedition() {
  try {
    const res = await fetch(`/api/room/${roomId}/vote-state?player=${encodeURIComponent(playerName)}`);
    const data = await res.json();
    expedition = data.expedition || [];

    // 出戰者顯示選擇面板；否則顯示等待
    if (expedition.includes(playerName)) {
      choicePanel.classList.remove("hidden");
      waitingPanel.classList.add("hidden");
    } else {
      waitingPanel.classList.remove("hidden");
      choicePanel.classList.add("hidden");
    }
  } catch (err) {
    alert("❌ 無法取得出戰名單");
    console.error(err);
  }
}

successBtn.addEventListener("click", () => {
  selectedCard = "SUCCESS";
  successBtn.classList.add("selected");
  failBtn.classList.remove("selected");
  confirmBtn.disabled = false;
});

failBtn.addEventListener("click", () => {
  selectedCard = "FAIL";
  failBtn.classList.add("selected");
  successBtn.classList.remove("selected");
  confirmBtn.disabled = false;
});

confirmBtn.addEventListener("click", async () => {
  if (!selectedCard) return;

  // 禁用按鈕與顯示送出狀態
  successBtn.disabled = true;
  failBtn.disabled = true;
  confirmBtn.disabled = true;
  confirmBtn.textContent = "已送出";

  try {
    const res = await fetch(`/api/room/${roomId}/mission-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player: playerName,
        result: selectedCard
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // ✅ 成功後切換畫面（不再顯示「你已選擇...」那串文字）
    choicePanel.classList.add("hidden");
    waitingPanel.classList.remove("hidden");
    // 不改動 waitingPanel 的既有內容（或保持空白）
  } catch (err) {
    alert("❌ 任務卡送出失敗");
    console.error(err);
    // 復原按鈕狀態
    successBtn.disabled = false;
    failBtn.disabled = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = "確認提交";
  }
});

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

document.addEventListener("DOMContentLoaded", () => {
  fetchExpedition();
  connectWebSocket(); // ✅ 別忘了呼叫它
});

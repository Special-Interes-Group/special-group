/**
 * 啟動角色圖片的閃爍動畫
 * @param {HTMLImageElement} imgElement - 要操作的圖片元素
 * @param {string} frame1 - 圖片路徑 1
 * @param {string} frame2 - 圖片路徑 2
 */
function startCharacterAnimation(imgElement, frame1, frame2) {
  let currentFrame = 1;
  setInterval(() => {
    if (!imgElement) return;
    imgElement.src = currentFrame === 1 ? frame2 : frame1;
    currentFrame = currentFrame === 1 ? 2 : 1;
  }, 800);
}

document.addEventListener("DOMContentLoaded", async () => {
  const roomId = new URLSearchParams(window.location.search).get("roomId");
  const resultEl = document.getElementById("result-message");

  // 木牌元素
  const resBoard = document.getElementById("faction-resources");
  const winnerEl = document.getElementById("winner");

  if (!roomId) {
    if (resultEl) resultEl.textContent = "無法取得房間 ID";
    return;
  }

  // ✅ 防止重複送出紀錄
  if (sessionStorage.getItem("recordSaved_" + roomId)) {
    console.log("⚠️ 此房間紀錄已儲存過，略過重複送出");
    return;
  }

  try {
    // 🔹 先從紀錄查詢（房間可能已刪除）
    let recordRes = await fetch(`/api/record/${roomId}`);
    if (recordRes.ok) {
      const record = await recordRes.json();
      renderResult(record, resultEl, resBoard, winnerEl);
      sessionStorage.setItem("recordSaved_" + roomId, "true");
      return;
    }

    // 🔹 如果紀錄不存在，再去讀房間資料
    const res = await fetch(`/api/room/${roomId}`);
    if (!res.ok) throw new Error("房間不存在");
    const room = await res.json();

    console.log("📦 從後端取得房間資料：", room);

    const success = room.successCount || 0;
    const fail = room.failCount || 0;
    let result = "";

    if (success > fail) {
      result = "正方勝利";
    } else if (fail > success) {
      result = "反方勝利";
    } else {
      result = "平手";
    }

    // 顯示結果在畫面與木牌上
    renderResult({ result, successCount: success, failCount: fail }, resultEl, resBoard, winnerEl);

    // ✅ 儲存紀錄（後端有 409 防重）
    await sendGameRecord(roomId, result);

    // ✅ 標記為已儲存，避免重複送出
    sessionStorage.setItem("recordSaved_" + roomId, "true");

  } catch (err) {
    console.error("❌ 無法載入結局資料", err);
    if (resultEl) resultEl.textContent = "無法取得遊戲結果，請稍後再試";
  }
});

/**
 * 🎯 顯示遊戲結果到頁面與木牌，並啟動角色動畫
 */
function renderResult(record, resultEl, resBoard, winnerEl) {
  const { result, successCount, failCount } = record;
  let msg = "";
  let winner = "";
  let pos = successCount || 0;
  let neg = failCount || 0;

  const goodGuysImg = document.getElementById("good-guys-img");
  const badGuysImg = document.getElementById("bad-guys-img");

  if (result.includes("正方")) { // 正方勝利
    msg = `✅ 正方勝利！成功卡 ${pos}，失敗卡 ${neg}`;
    winner = "正方";
    startCharacterAnimation(goodGuysImg, '/images/Good_Win1.png', '/images/Good_Win2.png');
    startCharacterAnimation(badGuysImg, '/images/Bad_Lose1.png', '/images/Bad_Lose2.png');
    document.body.style.background = `#000 url('/images/good.png') center/cover no-repeat fixed`;
  } else if (result.includes("反方")) { // 反方勝利
    msg = `❌ 反方勝利！失敗卡 ${neg}，成功卡 ${pos}`;
    winner = "反方";
    startCharacterAnimation(goodGuysImg, '/images/Good_Lose1.png', '/images/Good_Lose2.png');
    startCharacterAnimation(badGuysImg, '/images/Bad_Win1.png', '/images/Bad_Win2.png');
    document.body.style.background = `#000 url('/images/bad.png') center/cover no-repeat fixed`;
  } else { // 平手或未知
    msg = `⚖️ 平手！成功 ${pos}、失敗 ${neg}`;
    winner = "平手";
    startCharacterAnimation(goodGuysImg, '/images/Good_Lose1.png', '/images/Good_Lose2.png');
    startCharacterAnimation(badGuysImg, '/images/Bad_Lose1.png', '/images/Bad_Lose2.png');
    document.body.style.background = `#000 url('/images/good.png') center/cover no-repeat fixed`;
  }

  if (resultEl) resultEl.textContent = msg;

  if (resBoard && winnerEl) {
    resBoard.textContent = `正方：${pos}\n反方：${neg}`;
    winnerEl.textContent = `勝利方：${winner}`;
  }

  const boardImg = document.querySelector(".trophy-board");
  if (boardImg) {
    if (winner === "正方") boardImg.src = "/images/trophy-board-blue.png";
    else if (winner === "反方") boardImg.src = "/images/trophy-board-red.png";
    else boardImg.src = "/images/trophy-board.png";
  }
}

/**
 * 💾 儲存遊戲紀錄並刪除房間
 */
async function sendGameRecord(roomId, result) {
  try {
    const res = await fetch(`/api/room/${roomId}/end-game?result=${encodeURIComponent(result)}`, {
      method: "POST"
    });
    if (res.status === 409) {
      console.log("⚠️ 後端已存在紀錄（409 Conflict），略過重複儲存。");
    } else if (res.ok) {
      console.log("✅ 遊戲紀錄已儲存並將於3分鐘後刪除房間。");
    } else {
      console.warn("⚠️ 儲存紀錄時發生非預期錯誤。");
    }
  } catch (err) {
    console.error("❌ 無法儲存遊戲紀錄", err);
  }
}

// 🔹 若後端資料失敗或單純想測動畫，強制啟動角色動畫
document.addEventListener("DOMContentLoaded", () => {
  const good = document.getElementById("good-guys-img");
  const bad = document.getElementById("bad-guys-img");

  startCharacterAnimation(good, '/images/Good_Win1.png', '/images/Good_Win2.png');
  startCharacterAnimation(bad, '/images/Bad_Win1.png', '/images/Bad_Win2.png');
});

// /js/game-end.js

/**
 * 啟動角色圖片的閃爍動畫
 * @param {HTMLImageElement} imgElement - 要操作的圖片元素
 * @param {string} frame1 - 圖片路徑 1
 * @param {string} frame2 - 圖片路徑 2
 */
function startCharacterAnimation(imgElement, frame1, frame2) {
  let currentFrame = 1;
  setInterval(() => {
    if (currentFrame === 1) {
      imgElement.src = frame2;
      currentFrame = 2;
    } else {
      imgElement.src = frame1;
      currentFrame = 1;
    }
  }, 800);
}

document.addEventListener("DOMContentLoaded", async () => {
  const roomId = new URLSearchParams(window.location.search).get("roomId");
  const resultEl = document.getElementById("result-message");
  const resBoard = document.getElementById("faction-resources");
  const winnerEl = document.getElementById("winner");

  if (!roomId) {
    resultEl.textContent = "無法取得房間 ID";
    return;
  }

  try {
    // 🔹 先從紀錄查詢（房間可能已刪除）
    let recordRes = await fetch(`/api/room/${roomId}/record`);
    if (recordRes.ok) {
      const record = await recordRes.json();
      renderResult(record, resultEl, resBoard, winnerEl);
      return;
    }

    // 🔹 若紀錄不存在，改查房間即時資料
    const res = await fetch(`/api/room/${roomId}`);
    if (!res.ok) throw new Error("房間不存在");
    const room = await res.json();

    console.log("📦 從後端取得房間資料：", room);

    // ✅ 把技能加分也併入計算與顯示
    const success =
      (room.successCount || 0) + (room.goodExtraScore || 0);
    const fail =
      (room.failCount || 0) ;

    let result = "";
    if (success > fail*2) {
      result = "正方勝利";
    } else if (fail*2 > success) {
      result = "反方勝利";
    } else {
      result = "平手";
    }

    // ✅ 先送出紀錄（僅房主會生效）
    await sendGameRecord(roomId, result);

    // ✅ 顯示結果在畫面
    renderResult(
      { result, successCount: success, failCount: fail },
      resultEl,
      resBoard,
      winnerEl
    );

    // （可選）延遲 2 秒再重新讀正式紀錄，以確保資料庫同步
    setTimeout(async () => {
      try {
        const check = await fetch(`/api/room/${roomId}/record`);
        if (check.ok) {
          const finalRec = await check.json();
          renderResult(finalRec, resultEl, resBoard, winnerEl);
        }
      } catch (e) {
        console.warn("⚠️ 無法重新載入最終紀錄");
      }
    }, 2000);
  } catch (err) {
    console.error("❌ 無法載入結局資料", err);
    resultEl.textContent = "無法取得遊戲結果，請稍後再試";
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

  if (result.includes("正方")) {
    msg = `✅ 正方勝利！成功卡 ${pos}，失敗卡 ${neg}`;
    winner = "正方";
    startCharacterAnimation(
      goodGuysImg,
      "/images/Good_Win1.png",
      "/images/Good_Win2.png"
    );
    startCharacterAnimation(
      badGuysImg,
      "/images/Bad_Lose1.png",
      "/images/Bad_Lose2.png"
    );
    document.body.style.background = `#000 url('/images/good.png') center/cover no-repeat fixed`;
  } else if (result.includes("反方")) {
    msg = `❌ 反方勝利！失敗卡 ${neg}，成功卡 ${pos}`;
    winner = "反方";
    startCharacterAnimation(
      goodGuysImg,
      "/images/Good_Lose1.png",
      "/images/Good_Lose2.png"
    );
    startCharacterAnimation(
      badGuysImg,
      "/images/Bad_Win1.png",
      "/images/Bad_Win2.png"
    );
    document.body.style.background = `#000 url('/images/bad.png') center/cover no-repeat fixed`;
  } else {
    msg = `⚖️ 平手！成功 ${pos}、失敗 ${neg}`;
    winner = "平手";
    startCharacterAnimation(
      goodGuysImg,
      "/images/Good_Lose1.png",
      "/images/Good_Lose2.png"
    );
    startCharacterAnimation(
      badGuysImg,
      "/images/Bad_Lose1.png",
      "/images/Bad_Lose2.png"
    );
    document.body.style.background = `#000 url('/images/good.png') center/cover no-repeat fixed`;
  }

  if (resultEl) resultEl.textContent = msg;
  if (resBoard && winnerEl) {
    resBoard.textContent = `正方：${pos}\n反方：${neg}`;
    winnerEl.textContent = `勝利方：${winner}`;
  }

  const boardImg = document.querySelector(".trophy-board");
  if (boardImg) {
    boardImg.src = "/images/trophy-board.png";
  }
}

/**
 * 💾 儲存遊戲紀錄並刪除房間
 */
async function sendGameRecord(roomId, result) {
  const playerName = sessionStorage.getItem("playerName");
  const hostName = sessionStorage.getItem("hostName");

  if (playerName !== hostName) {
    console.log("ℹ️ 非房主，不送出遊戲紀錄");
    return;
  }

  try {
    const res = await fetch(
      `/api/room/${roomId}/end-game?result=${encodeURIComponent(
        result
      )}&playerName=${encodeURIComponent(playerName)}`,
      { method: "POST" }
    );

    if (res.ok) {
      console.log("✅ 房主已成功儲存遊戲紀錄");
    } else {
      const errMsg = await res.text();
      console.warn("⚠️ 儲存遊戲紀錄失敗:", errMsg);
    }
  } catch (err) {
    console.error("❌ 無法儲存遊戲紀錄", err);
  }
}

// 🔹 強制播放動畫（即使後端失敗）
document.addEventListener("DOMContentLoaded", () => {
  const good = document.getElementById("good-guys-img");
  const bad = document.getElementById("bad-guys-img");
  startCharacterAnimation(good, "/images/Good_Win1.png", "/images/Good_Win2.png");
  startCharacterAnimation(bad, "/images/Bad_Win1.png", "/images/Bad_Win2.png");
});

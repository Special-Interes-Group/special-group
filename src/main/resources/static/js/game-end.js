// /js/game-end.js
document.addEventListener("DOMContentLoaded", async () => {
  const roomId = new URLSearchParams(window.location.search).get("roomId");
  const resultEl = document.getElementById("result-message");

  if (!roomId) {
    resultEl.textContent = "無法取得房間 ID";
    return;
  }

  try {
    // 🔹 先嘗試從紀錄查詢（因為房間可能已經被刪掉）
    let recordRes = await fetch(`/api/record/${roomId}`);
    if (recordRes.ok) {
      const record = await recordRes.json();
      renderResult(resultEl, record.result, record.successCount, record.failCount);
      return;
    }

    // 🔹 如果紀錄不存在，再 fallback 去讀房間
    const res = await fetch(`/api/room/${roomId}`);
    if (!res.ok) throw new Error("房間不存在");
    const room = await res.json();

    const success = room.successCount || 0;
    const fail = room.failCount || 0;

    if (success > fail) {
      resultEl.textContent = `✅ 正方勝利！成功卡 ${success}，失敗卡 ${fail}`;
      await sendGameRecord(roomId, "正方勝利");
    } else if (fail > success) {
      resultEl.textContent = `❌ 反方勝利！失敗卡 ${fail}，成功卡 ${success}`;
      await sendGameRecord(roomId, "反方勝利");
    } else {
      resultEl.textContent = `⚖️ 雙方平手！成功 ${success}、失敗 ${fail}`;
      await sendGameRecord(roomId, "平手");
    }
  } catch (err) {
    console.error("❌ 無法載入結局資料", err);
    resultEl.textContent = "無法取得遊戲結果，請稍後再試";
  }
});

/**
 * 顯示遊戲結果
 */
function renderResult(resultEl, result, success, fail) {
  if (result.includes("正方")) {
    resultEl.textContent = `✅ 正方勝利！成功卡 ${success}，失敗卡 ${fail}`;
  } else if (result.includes("反方")) {
    resultEl.textContent = `❌ 反方勝利！失敗卡 ${fail}，成功卡 ${success}`;
  } else {
    resultEl.textContent = `⚖️ 平手！成功 ${success}、失敗 ${fail}`;
  }
}

/**
 * 呼叫 API 儲存遊戲紀錄
 */
async function sendGameRecord(roomId, result) {
  try {
    await fetch(`/api/room/${roomId}/end-game?result=${encodeURIComponent(result)}`, {
      method: "POST"
    });
    console.log("✅ 遊戲紀錄已儲存並刪除房間");
  } catch (err) {
    console.error("❌ 無法儲存遊戲紀錄", err);
  }
}

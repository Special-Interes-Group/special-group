document.addEventListener("DOMContentLoaded", async () => {
  const playerName = sessionStorage.getItem("playerName");
  if (!playerName) {
    console.warn("⚠️ 無法取得玩家名稱，統計與紀錄不會顯示");
    return;
  }

  let allRecords = [];

  try {
    // 1. 取得統計資料
    const statsRes = await fetch(`/api/game-records/stats/${encodeURIComponent(playerName)}`);
    if (!statsRes.ok) throw new Error("統計 API 回應錯誤");
    const statsData = await statsRes.json();
    document.getElementById("total-games").textContent = statsData.totalGames;
    document.getElementById("win-rate").textContent = `${statsData.winRate.toFixed(1)}%`;

    // 2. 取得玩家戰績列表
    const recordsRes = await fetch(`/api/game-records/player/${encodeURIComponent(playerName)}`);
    if (!recordsRes.ok) throw new Error("紀錄 API 回應錯誤");
    allRecords = await recordsRes.json();

    allRecords.sort((a, b) => new Date(b.playDate) - new Date(a.playDate)); // 新到舊

    // 初始渲染
    renderTable(allRecords, playerName);

    // 篩選事件監聽
    const filterSelect = document.getElementById("filter-select");
    if (filterSelect) {
      filterSelect.addEventListener("change", (e) => {
        const filter = e.target.value;
        if (filter === "all") {
          renderTable(allRecords, playerName);
        } else {
          const filtered = allRecords.filter(r => r.playerResults[playerName] === filter);
          renderTable(filtered, playerName);
        }
      });
    }

  } catch (err) {
    console.error("❌ 無法載入遊戲紀錄", err);
  }
});

function renderTable(records, playerName) {
  const tbody = document.getElementById("records-list");
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">尚無紀錄</td></tr>`;
    return;
  }

  records.forEach(record => {
    const tr = document.createElement("tr");

    // 日期
    const dateTd = document.createElement("td");
    dateTd.textContent = new Date(record.playDate).toLocaleString();
    tr.appendChild(dateTd);

    // 玩家數
    const countTd = document.createElement("td");
    countTd.textContent = record.playerCount;
    tr.appendChild(countTd);

    // 遊戲結果
    const resultTd = document.createElement("td");
    resultTd.textContent = record.result;
    tr.appendChild(resultTd);

    // 我的結果
    const myResultTd = document.createElement("td");
    myResultTd.textContent = record.playerResults[playerName] || "-";
    tr.appendChild(myResultTd);

    tbody.appendChild(tr);
  });
}

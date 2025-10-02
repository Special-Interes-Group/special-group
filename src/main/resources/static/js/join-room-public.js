document.addEventListener("DOMContentLoaded", () => {
  loadRoomList();
  document.getElementById("room-search")
          .addEventListener("input", filterRooms);
  setInterval(loadRoomList, 1000);
});

let allRooms = [];

async function loadRoomList() {
  try {
    const resp = await fetch('/api/rooms', { cache: "no-cache" });
    const rooms = await resp.json();
    // 只顯示公開房間
    allRooms = rooms.filter(r => r.roomType === "public");
    displayRooms(allRooms);
  } catch (e) {
    console.error(e);
  }
}

function displayRooms(rooms) {
  const list = document.getElementById("room-list");
  if (!rooms.length) {
    list.innerHTML = `<p class="no-room">沒有找到符合的公開房間</p>`;
    return;
  }
  list.innerHTML = "";
  rooms.forEach(r => {
    const div = document.createElement("div");
    div.className = "room-item";
    div.textContent = `房間名稱：${r.roomName}`;
    div.dataset.roomId = r.id;
    div.addEventListener("click", () => joinRoom(r.id));
    list.appendChild(div);
  });
}

function filterRooms() {
  const q = document.getElementById("room-search").value.toLowerCase();
  const filtered = allRooms.filter(r =>
    r.roomName.toLowerCase().includes(q)
  );
  displayRooms(filtered);
}

async function joinRoom(roomId) {
  const playerName = sessionStorage.getItem("playerName");
  if (!playerName) {
    alert("請先登入並設定玩家名稱！");
    return;
  }
  try {
    const resp = await fetch(
      `/api/join-room?roomId=${roomId}&playerName=${encodeURIComponent(playerName)}`,
      { method: "POST" }
    );
    const result = await resp.json();
    if (resp.ok && result.success) {
      alert("加入房間成功！");
      window.location.href = `/room/${roomId}`;
    } else {
      alert(result.message || "加入房間失敗！");
    }
  } catch (e) {
    console.error(e);
    alert("系統錯誤，請稍後再試！");
  }
}

function goBack() {
  window.location.href = '/join-room-selection';
}

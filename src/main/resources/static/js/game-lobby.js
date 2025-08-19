document.addEventListener("DOMContentLoaded", function () {
    // 顯示用戶名稱（優先從 localStorage 取）
    const username = localStorage.getItem("username") || sessionStorage.getItem("username") || "未登入";
    const usernameDisplay = document.getElementById("username-display");
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    }
});

// 登出功能：清除 localStorage 與 sessionStorage 中的 username
function logout() {
    sessionStorage.removeItem('username');
    localStorage.removeItem('username');
    window.location.href = '/';
}

// 導向功能
function createGameRoom() {
    window.location.href = "/create-room";
}

function joinGameRoom() {
    window.location.href = "/join-room-selection";
}

// 切換用戶資訊小視窗
function toggleUserInfoPopup() {
    const popup = document.getElementById("user-info-popup");
    popup.classList.toggle("hidden");
}


document.addEventListener('DOMContentLoaded', () => {
  const volSlider = document.getElementById('bgm-volume');
  if (!volSlider) return;

  // 從 localStorage 還原音量
  try {
    const saved = Number(localStorage.getItem('bgm_volume'));
    if (!Number.isNaN(saved)) volSlider.value = saved;
  } catch {}

  // 當拉桿調整時，傳訊息給外殼控制 BGM
  volSlider.addEventListener('input', () => {
    const v = Math.max(0, Math.min(1, volSlider.value / 100));
    try {
      window.top.postMessage({ type: 'bgm:setVolume', value: v }, '*');
      localStorage.setItem('bgm_volume', volSlider.value); // 同步更新
    } catch {}
  });
});



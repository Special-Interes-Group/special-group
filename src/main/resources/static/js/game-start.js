const avatarImages = document.querySelectorAll('.avatar-option');
const startButton = document.querySelector('.start-button');
const confirmBtn = document.getElementById('confirm-avatar');
const roomId = window.location.pathname.split("/").pop();
let stompClient = null;
let allPlayersSelected = false;
let players = [];
let selectedAvatar = null;

// 更新「確認頭貼」按鈕可用狀態
function updateConfirmState() {
  const enabled = !!selectedAvatar;
  confirmBtn.disabled = !enabled;
  confirmBtn.setAttribute('aria-disabled', String(!enabled));
}

// 玩家選擇頭像
avatarImages.forEach(img => {
  img.addEventListener('click', () => {
    avatarImages.forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
    selectedAvatar = img.getAttribute('data-avatar');
    localStorage.setItem('selectedAvatar', selectedAvatar);
    updateConfirmState();
  });
}); // ← 這一行是你原本少掉的收尾

// 初始狀態：未選不可按（並還原先前選擇）
document.addEventListener('DOMContentLoaded', () => {
  const cached = localStorage.getItem('selectedAvatar');
  if (cached) {
    const pre = Array.from(avatarImages).find(i => i.getAttribute('data-avatar') === cached);
    if (pre) {
      pre.classList.add('selected');
      selectedAvatar = cached;
    }
  }
  updateConfirmState();

  connectWebSocket();
  startButton.textContent = '等待其他玩家選擇頭貼...';
  startButton.disabled = true;

  confirmBtn.addEventListener('click', confirmAvatar);
});

// 確認頭像選擇
async function confirmAvatar() {
  const playerName = sessionStorage.getItem('playerName');

  if (!selectedAvatar) return alert('請先選擇頭貼！');
  if (!playerName) return alert('尚未登入！');

  confirmBtn.disabled = true; // 避免連點
  confirmBtn.textContent = '送出中...';

  try {
    const res = await fetch(`/api/room/${roomId}/select-avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, avatar: selectedAvatar })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    confirmBtn.textContent = '已確認';
    confirmBtn.disabled = true;
    confirmBtn.setAttribute('aria-disabled', 'true');
  } catch (err) {
    console.error('確認頭貼失敗:', err);
    alert('確認失敗，請重試');
    confirmBtn.textContent = '確認頭貼';
    updateConfirmState();
  }
}

// 角色分配後，撈玩家列表 + 角色資訊
async function fetchAssignedRoles() {
  try {
    const response = await fetch(`/api/room/${roomId}/players`);
    players = await response.json();

    const roleRes = await fetch(`/api/room/${roomId}/roles`);
    if (!roleRes.ok) throw new Error('角色 API 失敗');

    const rolesMap = await roleRes.json();
    console.log('取得角色資訊', rolesMap);

    applyRolesToPlayers(rolesMap);
  } catch (err) {
    console.error('無法取得角色資料', err);
  }
}

let myRole = null;
function applyRolesToPlayers(rolesMap) {
  const playerName = sessionStorage.getItem('playerName');
  const assigned = players.map(p => ({
    ...p,
    role: rolesMap[p.name]
  }));

  const self = assigned.find(p => p.name === playerName);
  if (self) {
    myRole = self.role;
    setTimeout(showRolePopup, 500);
  }
}

function showRolePopup() {
  const title = document.getElementById('role-title');
  const roleImg = document.getElementById('role-image');
  const popup = document.getElementById('role-popup');
  if (title) title.textContent = `你是 ${myRole.name}`;
  if (roleImg) roleImg.src = `/images/${myRole.image}`;
  if (popup) popup.classList.remove('hidden');
}

// 建立 WebSocket
function connectWebSocket() {
  const socket = new SockJS('/ws');
  stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/room/${roomId}`, async (message) => {
      const msg = message.body.trim();
      console.log('收到 WebSocket 訊息:', msg);

      if (msg === 'allAvatarSelected') {
        allPlayersSelected = true;

        const playerName = sessionStorage.getItem('playerName');
        try {
          const res = await fetch(`/api/start-real-game?roomId=${roomId}&playerName=${playerName}`, { method: 'POST' });
          if (res.status === 409) return; // 已分配過，略過
          const rolesMap = await res.json();
          console.log('觸發角色分配，回傳：', rolesMap);
        } catch (err) {
          console.error('分配角色失敗:', err);
        }
      }

      if (msg === 'startRealGame') {
        fetch(`/api/room/${roomId}`)
          .then(res => res.json())
          .then(() => {
            window.location.href = `/game-front-page.html?roomId=${roomId}`;
          })
          .catch(err => {
            console.error('取得房間資訊失敗', err);
          });
      }

      if (msg.startsWith('avatarSelected:')) {
        const name = msg.split(':')[1];
        console.log(`${name} 已選擇頭貼`);
      }
    });
  }, function (error) {
    console.error('WebSocket 連線失敗:', error);
  });
}

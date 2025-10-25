// /js/game-front-page.js
const urlParams  = new URLSearchParams(window.location.search);
const roomId     = urlParams.get("roomId");
const playerName = sessionStorage.getItem("playerName");

let players = [];
let myRole  = null;
let leaderId = null;
let currentRound = 1;
let selectedOrder = [];

const positionMap = {
  5: [
    {top:'3%',left:'55%'},
    {top:'3%',right:'55%'},
    {top:'40%',left:'20%'},
    {top:'40%',right:'20%'},
    {bottom:'30px',left:'50%',transform:'translateX(-50%)'}
  ],
  6: [ 
    { top: '55%',  left: '15%' },
    { top: '15%',  left: '15%' },
    { top: '3%',   left: '50%', transform: 'translateX(-50%)' },
    { top: '15%',  right: '15%' },
    { top: '55%',  right: '15%' },
    { bottom:'5%', left: '50%', transform: 'translateX(-50%)' },
  ],
  7: [
    { top: '55%', left: '75%' },
    { top: '15%', left: '75%' },
    { top: '5%',  right:'55%'},
    { top: '5%',  left:'55%' },
    { top: '15%', left: '10%' },
    { top: '55%', left: '10%' },
    { bottom: '30px', left: '50%', transform: 'translateX(-50%)' },
  ],
  8: [ 
    { bottom:'10%', left: '25%' },                              
    { top: '30%',  left: '10%' },                                
    { top: '10%',  left: '25%' },
    { top: '5%',   left: '50%', transform: 'translateX(-50%)' }, 
    { top: '10%',  right: '25%' },                              
    { top: '30%',  right: '10%' },                               
    { bottom:'10%', right: '25%' },                             
    { bottom:'5%',  left: '50%', transform: 'translateX(-50%)'},
  ],
  9: [
    { bottom:'8%', left: '30%' },                             
    { bottom:'15%',  left: '15%' },                               
    { bottom: '55%',  left: '20%' },
    { top: '5%',  left: '35%'},
    { top: '5%',  right: '35%' },                         
    { bottom: '55%',  right: '20%' },                              
    { bottom:'15%',  right: '15%' },                              
    { bottom:'8%', right: '30%' },                            
    { bottom:'5%',  left: '50%', transform: 'translateX(-50%)'},
  ],
  10: [
    { top:'3%',   left:'50%', transform:'translateX(-50%)' }, 
    { top:'10%',  right:'15%' },                             
    { top:'30%',  right:'3%' },                              
    { top:'60%',  right:'3%' },                              
    { bottom:'10%',right:'15%' },                            
    { bottom:'3%', left:'50%', transform:'translateX(-50%)'},
    { bottom:'10%',left:'15%' },                             
    { top:'60%',  left:'3%' },                               
    { top:'30%',  left:'3%' },                               
    { top:'10%',  left:'15%' }
  ]
};

const expeditionConfig = {
  5: { totalRounds: 5, picks: [2, 2, 2, 3, 3] },
  6: { totalRounds: 6, picks: [2, 2, 3, 3, 4, 3] },
  7: { totalRounds: 6, picks: [3, 3, 4, 4, 4, 4] },
  8: { totalRounds: 7, picks: [3, 3, 4, 4, 4, 5, 5] },
  9: { totalRounds: 7, picks: [4, 4, 4, 5, 5, 5, 5] }
};

function getMaxPick(currentround, count) {
  const config = expeditionConfig[count];
  if (!config) return 2;
  return config.picks[currentround - 1] || config.picks.at(-1);
}

function reorderPlayers(arr){
  const meIdx = arr.findIndex(p => p.name === playerName);
  if (meIdx === -1) return arr;
  const ordered = [];
  for (let i = 1; i < arr.length; i++) ordered.push(arr[(meIdx + i) % arr.length]);
  ordered.push(arr[meIdx]);
  return ordered;
}

function renderPlayers(arr){
  const container = document.getElementById("player-container");
  container.innerHTML = "";

  const ordered   = reorderPlayers(arr);
  const positions = positionMap[ordered.length] || [];

  ordered.forEach((p, idx) => {
    const isSelf   = p.name === playerName;
    const isLeader = p.name === leaderId;
    const card     = document.createElement("div");
    card.className = `player-card${isLeader ? " leader" : ""}${isSelf ? " player-self" : ""}`;
    Object.entries(positions[idx] || {}).forEach(([k, v]) => card.style[k] = v);
    card.innerHTML = `
      <div class="avatar"><img src="/images/${p.avatar}" alt="${p.name}"></div>
      <div class="name">${p.name}</div>
      ${isSelf && p.role ? `<div class="role-label">角色：${p.role}</div>` : ""}
    `;
  if (isSelf && p.role) {
  const key = normalizeRoleKey(p.role);               // 例：engineer / medic…
  card.dataset.role = key;                            // ⚠ 改成英文 key，才能吃到 CSS 外框
  card.dataset.roleKey = key;                         // 與上同
  card.dataset.roleName = p.role;                     // 另存中文名（顯示/提示用）
}

        container.appendChild(card);
  });

  document.getElementById("leader-action")?.classList.toggle("hidden", leaderId !== playerName);
  // 新增：每次 render 完就包裝翻牌（card-flip.js 會提供這隻方法）
  window.roleFlipWrapNewCards?.();
}
function normalizeRoleKey(name) {
  const map = {
    '偵查官':  'engineer',
    '醫護兵':  'medic',
    '破壞者':  'saboteur',
    '影武者':  'shadow',
    '潛伏者':  'lurker',
    '指揮官':  'commander',
    '普通倖存者': 'civilian-good', // ← 好平民（後端字串）
    '邪惡平民':   'civilian-bad',  // ← 壞平民（後端字串）
    '平民':      'civilian'        // 備用：如果哪裡仍傳「平民」
  };
  return map[name] || String(name).toLowerCase();
}
function openSelectModal(){
  const maxPick   = getMaxPick(currentRound, players.length);
  const candidates = players;
  const listEl     = document.getElementById('candidate-list');
  listEl.innerHTML = '';
  selectedOrder = [];

  candidates.forEach(p => {
    const li = document.createElement('li');
    li.dataset.name = p.name;
    li.innerHTML = `<span class="order"></span><span>${p.name}</span>`;
    li.addEventListener('click', () => toggleSelect(li, maxPick));
    listEl.appendChild(li);
  });

  document.getElementById('select-title').textContent = `請選擇 ${maxPick} 名出戰人員 (剩 ${maxPick})`;
  document.getElementById('select-modal').classList.remove('hidden');
}

function toggleSelect(li, maxPick){
  const name = li.dataset.name;
  const idx  = selectedOrder.indexOf(name);
  if (idx === -1) {
    if (selectedOrder.length >= maxPick) return;
    selectedOrder.push(name);
  } else {
    selectedOrder.splice(idx, 1);
  }

  document.querySelectorAll('#candidate-list li').forEach(li2 => {
    const orderEl = li2.querySelector('.order');
    const i = selectedOrder.indexOf(li2.dataset.name);
    if (i === -1) {
      li2.classList.remove('selected'); orderEl.textContent = '';
    } else {
      li2.classList.add('selected');    orderEl.textContent = i + 1;
    }
  });

  const remain = maxPick - selectedOrder.length;
  document.getElementById('select-title').textContent =
    `請選擇 ${maxPick} 名出戰人員 (剩 ${remain})`;
}

function closeSelectModal(){
  document.getElementById('select-modal').classList.add('hidden');
}

async function confirmSelection(){
  const maxPick = getMaxPick(currentRound, players.length);
  if (selectedOrder.length !== maxPick) {
    alert(`請選滿 ${maxPick} 人！`); return;
  }
  try{
    await fetch(`/api/room/${roomId}/start-vote`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ expedition: selectedOrder })
    });
    closeSelectModal();
    window.location.href = `/vote.html?roomId=${roomId}`;
  }catch(err){
    console.error("❌ 無法開始投票", err);
    alert("後端連線失敗，請稍後再試！");
  }
}

function applyRolesToPlayers(roleMap){
  players = players.map(p => ({...p, role: roleMap[p.name]?.name}));
  renderPlayers(players);
  const self = players.find(p => p.name === playerName);
  if (self) { myRole = self.role; localStorage.setItem('myRole', myRole || ""); }
}

async function fetchPlayers(){
  try{
    const res = await fetch(`/api/room/${roomId}/players`);
    players = await res.json();
    renderPlayers(players);
  }catch(err){
    console.error("❌ 無法載入玩家資料", err);
  }
}

async function fetchAssignedRoles(){
  try{
    const res = await fetch(`/api/room/${roomId}/roles`);
    if (!res.ok) throw new Error();
    const { assignedRoles, currentLeader } = await res.json();
    leaderId = currentLeader;
    applyRolesToPlayers(assignedRoles);
  }catch(err){
    console.error("❌ 無法取得角色資料", err);
  }
}

function connectWebSocket() {
  if (!window.stompClient) {
    const socket = new SockJS('/ws');
    window.stompClient = Stomp.over(socket);
  }
  const stompClient = window.stompClient;
  if (stompClient.connected) return;

  stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/room/${roomId}`, async msg => {
      let payload;
      try {
        payload = JSON.parse(msg.body); // 嘗試解析成 JSON
      } catch {
        payload = msg.body.trim(); // 如果不是 JSON，就當純文字處理
      }

      if (payload === "allSkillUsed") {
        await fetchAssignedRoles();
        await fetchMissionSummary();
      }

      if (payload === "startRealGame") {
        await fetchAssignedRoles();
        window.location.href = `/game-front-page.html?roomId=${roomId}`;
      }

      // ✅ 遊戲結束廣播，帶結果與卡數跳轉
      if (typeof payload === "object" && payload.type === "GAME_END") {
        const params = new URLSearchParams({
          roomId,
          result: payload.result,
          success: payload.success,
          fail: payload.fail
        });
        window.location.href = `/game-end.html?${params.toString()}`;
      }
    });

    stompClient.subscribe(`/topic/leader/${roomId}`, msg => {
      leaderId = msg.body;
      renderPlayers(players);
    });

    stompClient.subscribe(`/topic/vote/${roomId}`, () => {
      if (!location.pathname.startsWith("/vote")) {
        window.location.href = `/vote.html?roomId=${roomId}`;
      }
    });
  });
}


function showRoundResult(success, fail) {
  const resultText = `本回合結果：成功 ${success} 張，失敗 ${fail} 張`;
  const popup = document.getElementById("round-result-popup");
  const text  = document.getElementById("round-result-text");
  text.textContent = resultText;
  popup.classList.remove("hidden");
  setTimeout(() => popup.classList.add("hidden"), 5000);
}

function updateOverallStats(successCount, failCount) {
  document.getElementById("success-count").textContent = successCount;
  document.getElementById("fail-count").textContent    = failCount;
}

function updateRoundLabel(round, totalRounds) {
  const label = document.getElementById("round-label");
  if (label && round) {
    label.textContent = totalRounds
      ? `第 ${round} 輪 / 共 ${totalRounds} 輪`
      : `第 ${round} 輪`;
  }
}

async function fetchMissionSummary() {
  try {
    const res  = await fetch(`/api/room/${roomId}`);
    const room = await res.json();

    currentRound = room.currentRound;
    const config      = expeditionConfig[room.playerCount];
    const totalRounds = config?.totalRounds || 5;

    updateRoundLabel(currentRound, totalRounds);
    updateOverallStats(room.successCount || 0, room.failCount || 0);

    const skip = sessionStorage.getItem("skipMission");
    if (skip === "true") {
      sessionStorage.removeItem("skipMission");
      return;
    }

    const round    = room.currentRound;
    const lastRound = round - 1;

    if (room.missionResults && room.missionResults[lastRound]) {
      const { successCount, failCount } = room.missionResults[lastRound];
      showRoundResult(successCount, failCount);
    }

    if (currentRound > totalRounds) {
      window.location.href = `/game-end.html?roomId=${roomId}`;
      return;
    }
  } catch (err) {
    console.error("❌ 無法取得任務結果", err);
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  // ✅ 語音區塊控制（改用右下角 chat.png 圖示）
  const voiceContainer = document.getElementById("voice-container");
  const voiceIframe    = document.getElementById("voice-iframe");
  const voiceHeader    = document.getElementById("voice-header"); // 拖曳把手
  const voiceToggleImg = document.getElementById("voice-toggle-img");
  const resizeHandle   = document.getElementById("voice-resize-handle"); // 專用縮放把手

  // 預設清除 bottom/right 避免干擾拖曳
  voiceContainer.style.bottom = "auto";
  voiceContainer.style.right  = "auto";

  // 開關語音視窗
  voiceToggleImg?.addEventListener("click", () => {
    const visible = voiceContainer.style.display !== "none" && voiceContainer.style.display !== "";
    if (!visible) {
      const jitsiBase    = "https://meet.jit.si";
      const jitsiProject = "underground";
      const jitsiRoom    = `${jitsiProject}-${roomId}`;
      voiceIframe.src    = `${jitsiBase}/${jitsiRoom}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
      voiceContainer.style.display = "block";
      voiceContainer.style.position = "fixed";

      // ✅ 初始化定位（只在第一次打開或尚未設定 left/top 時做）
      if (!voiceContainer.style.left || !voiceContainer.style.top) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const w  = voiceContainer.offsetWidth;
        const h  = voiceContainer.offsetHeight;
        voiceContainer.style.left = (vw - w - 10) + "px";
        voiceContainer.style.top  = (vh - h - 110) + "px";
      }
    } else {
      voiceContainer.style.display = "none";
      voiceIframe.src = "";
    }
  });

  // —— 拖曳邏輯（只允許從 header 拖曳）——
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

const startDrag = (clientX, clientY, target) => {
  // 如果點擊的是縮放把手，直接不啟動拖曳
  if (resizeHandle && resizeHandle.contains(target)) return;

  // 只允許從 header 拖曳
  if (!voiceHeader.contains(target)) return;

  dragging = true;
  const rect = voiceContainer.getBoundingClientRect();
  startLeft = rect.left;
  startTop  = rect.top;
  startX = clientX;
  startY = clientY;
  document.body.style.userSelect = "none";
};


  const onMove = (clientX, clientY) => {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;

    let nextLeft = startLeft + dx;
    let nextTop  = startTop  + dy;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = voiceContainer.offsetWidth;
    const h  = voiceContainer.offsetHeight;

    nextLeft = Math.min(Math.max(nextLeft, 0), vw - w);
    nextTop  = Math.min(Math.max(nextTop,  0), vh - h);

    voiceContainer.style.left = nextLeft + "px";
    voiceContainer.style.top  = nextTop  + "px";
  };

  const endDrag = () => {
    dragging = false;
    document.body.style.userSelect = "";
  };

  voiceHeader?.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY, e.target));
  document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  document.addEventListener("mouseup", endDrag);

  voiceHeader?.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, e.target);
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
  }, { passive: false });
  document.addEventListener("touchend", endDrag);

  // —— 專用縮放把手邏輯 —— 
  let resizing = false;
  let startWidth = 0, startHeight = 0;

  resizeHandle?.addEventListener("mousedown", (e) => {
    e.preventDefault();
    resizing = true;
    startWidth = voiceContainer.offsetWidth;
    startHeight = voiceContainer.offsetHeight;
    startX = e.clientX;
    startY = e.clientY;
    document.body.style.userSelect = "none";
  });

document.addEventListener("mousemove", (e) => {
  if (!resizing) return;
  const newWidth = startWidth + (e.clientX - startX);
  const newHeight = startHeight + (e.clientY - startY);
  voiceContainer.style.width = newWidth + "px";
  voiceContainer.style.height = newHeight + "px";
});


  document.addEventListener("mouseup", () => {
    resizing = false;
    document.body.style.userSelect = "";
  });

  // ⬇️ 原本初始化流程照常
  await fetch(`/api/room/${roomId}/assign-roles`, { method: 'POST' });

  try {
    const res = await fetch(`/api/room/${roomId}`);
    if (res.ok) {
      const room = await res.json();
      localStorage.setItem("roomName", room.roomName || "");
    }
  } catch (err) {
    console.error("❌ 無法取得房間名稱：", err);
  }

  await fetchPlayers();
  await fetchAssignedRoles();

  const avatar = sessionStorage.getItem("playerAvatar");
  if (playerName) localStorage.setItem("username", playerName);
  if (avatar)     localStorage.setItem("selectedAvatar", avatar);

  const my = players.find(p => p.name === playerName);
  if (my && my.role) {
    localStorage.setItem("myRole", my.role);
  }

  document.getElementById("select-expedition-btn")
    ?.addEventListener("click", openSelectModal);
  connectWebSocket();
  await fetchMissionSummary();

  // —— 設定彈窗開關（放在 DOMContentLoaded 內） ——
  const settingsBtn   = document.getElementById('settings-btn');
  const settingsPopup = document.getElementById('settings-popup');
  const settingsClose = document.getElementById('settings-close-btn');

  // 防呆：元素是否都抓到了
  console.log('[settings] btn:', !!settingsBtn, 'popup:', !!settingsPopup, 'close:', !!settingsClose);

  settingsBtn?.addEventListener('click', () => {
    settingsPopup?.classList.remove('hidden');
  });

  settingsClose?.addEventListener('click', () => {
    settingsPopup?.classList.add('hidden');
  });

  // 點背景關閉
  settingsPopup?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-popup') {
      settingsPopup.classList.add('hidden');
    }
  });
}); // <— 這個 DOMContentLoaded 的大括號與括號一定要有！
// 登出功能：清除 localStorage 與 sessionStorage 中的 username
function logout() {
  sessionStorage.removeItem('username');
  localStorage.removeItem('username');
  window.location.href = '/';
}

// 切換用戶資訊小視窗
function toggleUserInfoPopup() {
  const popup = document.getElementById("user-info-popup");
  popup.classList.toggle("hidden");
}

// 顯示用戶名稱
document.addEventListener("DOMContentLoaded", function () {
  const username = localStorage.getItem("username") || sessionStorage.getItem("username") || "未登入";
  const usernameDisplay = document.getElementById("username-display");
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
  }
});

// 音量調整
document.addEventListener('DOMContentLoaded', () => {
  const volSlider = document.getElementById('bgm-volume');
  if (!volSlider) return;

  try {
    const saved = Number(localStorage.getItem('bgm_volume'));
    if (!Number.isNaN(saved)) volSlider.value = saved;
  } catch {}

  volSlider.addEventListener('input', () => {
    const v = Math.max(0, Math.min(1, volSlider.value / 100));
    try {
      window.top.postMessage({ type: 'bgm:setVolume', value: v }, '*');
      localStorage.setItem('bgm_volume', volSlider.value);
    } catch {}
  });
});

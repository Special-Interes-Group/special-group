// /js/skill.js
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const playerName = sessionStorage.getItem("playerName");

const waitingPanel = document.getElementById("waiting-panel");
const skillPanel = document.getElementById("my-skill-panel");
const skillMsg = document.getElementById("skill-message");
const skillRoleLabel = document.getElementById("skill-role-label");

const engineerPanel = document.getElementById("engineer-panel");
const successCountEl = document.getElementById("success-count");
const failCountEl = document.getElementById("fail-count");

const lurkerPanel = document.getElementById("lurker-panel");
const lurkerSelect = document.getElementById("lurker-target-select");
const lurkerBtn = document.getElementById("use-lurker-skill-btn");
const lurkerStatus = document.getElementById("lurker-status-msg");

const commanderPanel = document.getElementById("commander-panel");
const commanderSelect = document.getElementById("commander-target-select");
const commanderBtn = document.getElementById("use-commander-skill-btn");
const commanderResult = document.getElementById("commander-skill-result");

const saboteurPanel = document.getElementById("saboteur-panel");
const saboteurSelect = document.getElementById("saboteur-target-select");
const saboteurBtn = document.getElementById("use-saboteur-skill-btn");
const saboteurStatus = document.getElementById("saboteur-status-msg");

const medicPanel = document.getElementById("medic-panel");
const medicSelect = document.getElementById("medic-select");
const medicBtn = document.getElementById("use-medic-skill-btn");
const medicStatus = document.getElementById("medic-status-msg");

const shadowPanel = document.getElementById("shadow-panel");
const shadowSelect = document.getElementById("shadow-select");
const shadowBtn = document.getElementById("use-shadow-skill-btn");
const shadowStatus = document.getElementById("shadow-status-msg");

let myRole = null;
// ✅ 初始化
document.addEventListener("DOMContentLoaded", async () => {
  myRole = await fetchMyRole();
  if (!myRole) {
    alert("無法取得你的角色，請重新進入遊戲");
    return;
  }

  // ⭐ 依角色套用背景
  applyRoleTheme(myRole);

  if (myRole === "潛伏者") await fetchLurkerTargets();
  if (myRole === "指揮官") await fetchCommanderTargets();
  if (myRole === "破壞者") await fetchSaboteurTargets();
  if (myRole === "醫護兵") await fetchMedicTargets();
  if (myRole === "影武者") await fetchShadowTargets();

  connectSkillPhase();
  startCountdown(20);
});
// —— 角色判斷輔助 —— //
function isGoodCivilian(name) {
  return name === "普通倖存者" || name === "平民" || name === "civilian-good";
}
function isBadCivilian(name) {
  return name === "邪惡平民" || name === "civilian-bad";
}
function isCivilian(name) {
  return isGoodCivilian(name) || isBadCivilian(name);
}

// —— 沉浸式等待文案 —— //
function immersiveMessage(roleName) {
  if (isGoodCivilian(roleName)) {
    return "您的農作物將在最後迎來豐收，耐心照料這片土地。";
  }
  if (isBadCivilian(roleName)) {
    return "陰影正在集結，等待最後的號角響起。";
  }
  // 其他職業（可依世界觀再細修）
  switch (roleName) {
    case "工程師":  return "你正在校準儀表與管線，等待系統指示。";
    case "醫護兵":  return "你在整理醫療包與繃帶，靜候下一個訊號。";
    case "破壞者":  return "你在擦拭工具，默數倒計時的每一刻。";
    case "潛伏者":  return "你貼近牆角，呼吸如絲，等待破綻。";
    case "影武者":  return "你隱沒在縫隙之中，凝視即將落下的夜幕。";
    case "指揮官":  return "你檢閱地圖與旗幟，等待最後的口令。";
    default:        return "靜待時機，讓命運的指針走到應屬於你的刻度。";
  }
}
// —— 顯示世界觀句子，並隱藏技能面板 —— //
function showImmersiveForRole(roleName) {
  const msg = immersiveMessage(roleName);
  const skillMsg = document.getElementById("skill-msg");   // 你原本顯示狀態的文字區
  const waitingPanel = document.getElementById("waiting-panel");
  const skillPanel = document.getElementById("my-skill-panel");
  if (skillMsg) skillMsg.textContent = msg;
  if (waitingPanel) waitingPanel.classList.remove("hidden");
  if (skillPanel) skillPanel.classList.add("hidden");
  const ultPanel = document.getElementById("civilian-ultimate-panel");
  if (ultPanel) ultPanel.classList.add("hidden");
}


// ⭐ 新增：角色名稱轉換 + 套用背景
function normalizeRoleKey(name) {
  const map = {
    '工程師':  'engineer',
    '醫護兵':  'medic',
    '破壞者':  'saboteur',
    '影武者':  'shadow',
    '潛伏者':  'lurker',
    '指揮官':  'commander',
    '普通倖存者': 'civilian-good',
    '邪惡平民':   'civilian-bad',
    '平民':      'civilian'
  };
  return map[name] || String(name).toLowerCase();
}

function applyRoleTheme(roleName) {
  const key = normalizeRoleKey(roleName);
  document.body.classList.add(`role-${key}`);
}

// ✅ 取得自己的角色
async function fetchMyRole() {
  const res = await fetch(`/api/room/${roomId}/roles`);
  const data = await res.json();
  return data.assignedRoles[playerName]?.name || null;
}

// ✅ WebSocket 連線 + 技能流程啟動
function connectSkillPhase() {
  const socket = new SockJS('/ws');
  const stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/skill/${roomId}`, msg => {
      const body = msg.body.trim();
      console.log("🧠 技能廣播：", body);

      if (body === "allSkillUsed") {
        skillMsg.textContent = "所有技能發動完畢，返回遊戲畫面...";
        setTimeout(() => {
          window.location.href = `/game-front-page.html?roomId=${roomId}`;
        }, 2000);
      }
    });
    fetch(`/api/room/${roomId}/skill-state`)
      .then(res => res.json())
      .then(data => {
        const skillRoles = data.remainingRoles || [];
        console.log("技能角色列表：", skillRoles);
        console.log("我的角色：", myRole);

        if (skillRoles.includes(myRole)) {
          skillRoleLabel.textContent = `角色：${myRole}`;
          waitingPanel.classList.add("hidden");
          skillPanel.classList.remove("hidden");

          if (myRole === "工程師") showEngineerResult();
          if (myRole === "潛伏者") lurkerPanel.classList.remove("hidden");
          if (myRole === "指揮官") commanderPanel.classList.remove("hidden");
          if (myRole === "破壞者") saboteurPanel.classList.remove("hidden");
          if (myRole === "醫護兵") medicPanel.classList.remove("hidden");
          if (myRole === "影武者") shadowPanel.classList.remove("hidden");
        } else {
          // 抓房間資訊來判斷是否最後一回合
          fetch(`/api/room/${roomId}`)
            .then(r => r.json())
            .then(room => {
              const isFinalRound = room.currentRound === room.totalRounds;

              if (isCivilian(myRole)) {
                if (isFinalRound) {
                  // —— 平民在最後一回合顯示「終極技能」面板 —— //
                  const ultPanel = document.getElementById("civilian-ultimate-panel");
                  const skillPanel = document.getElementById("my-skill-panel");
                  const waitingPanel = document.getElementById("waiting-panel");
                  if (ultPanel) {
                    ultPanel.classList.remove("hidden");
                    fetchCivilianUltimateTargets();
                  }
                  if (waitingPanel) waitingPanel.classList.add("hidden");
                  if (skillPanel)   skillPanel.classList.remove("hidden");
                  const skillMsg = document.getElementById("skill-msg");
                  if (skillMsg) skillMsg.textContent = immersiveMessage(myRole); // 可保留一行敘事
                } else {
                  // —— 平民：除了最後一回合，永遠顯示世界觀句子 —— //
                  showImmersiveForRole(myRole);
                }
              } else {
                // 非平民（工程師/醫護兵/影武者...）
                // 尚未使用技能時維持原本流程，但文案也改成沉浸式
                const skillMsg = document.getElementById("skill-msg");
                const waitingPanel = document.getElementById("waiting-panel");
                const skillPanel = document.getElementById("my-skill-panel");
                if (skillMsg) skillMsg.textContent = immersiveMessage(myRole);
                if (waitingPanel) waitingPanel.classList.remove("hidden");
                if (skillPanel)   skillPanel.classList.add("hidden");
              }
            })
            .catch(() => {
              // 取不到房間就以沉浸式等待處理
              showImmersiveForRole(myRole);
            });
        } // ← 收掉 else
      }); // ← 收掉 .then(data => { ... })
  });   // ← 收掉 stompClient.connect 回呼
}       // ← 收掉 function connectSkillPhase


// ✅ 工程師
async function showEngineerResult() {
  try {
    const [roomRes, stateRes] = await Promise.all([
      fetch(`/api/room/${roomId}`),
      fetch(`/api/room/${roomId}/skill-state`)
    ]);

    const room = await roomRes.json();
    const state = await stateRes.json();
    const round = room.currentRound;
    const result = room.missionResults?.[round];
    const blockedRoles = state.blockedRoles || [];

    engineerPanel.classList.remove("hidden");

    // ✅ 若工程師被封鎖，顯示提示文字，並跳出
    if (blockedRoles.includes("工程師")) {
      engineerPanel.innerHTML = `<p style="color:red; font-weight:bold;">{你的技能已被封鎖!}</p>`;
      return;
    }

    // ✅ 正常顯示成功/失敗數
    successCountEl.textContent = result ? result.successCount : "尚未送出";
    failCountEl.textContent    = result ? result.failCount : "尚未送出";

  } catch (err) {
    console.error("❌ 工程師任務結果讀取失敗", err);
  }
}


// ✅ 潛伏者
async function fetchLurkerTargets() {
  try {
    const res = await fetch(`/api/room/${roomId}`);
    const room = await res.json();
    const submissions = room.missionResults?.[room.currentRound]?.cardMap || {};
    const usedMap = room.usedSkillMap || {};

    if (usedMap[playerName]) {
      lurkerStatus.textContent = "❗ 你已使用過技能，無法再次使用。";
      lurkerBtn.disabled = true;
      lurkerSelect.disabled = true;
      return;
    }

    lurkerSelect.innerHTML = `<option value="">-- 選擇要反轉的玩家 --</option>`;
    Object.keys(submissions).forEach(player => {
      if (player !== playerName) {
        const option = document.createElement("option");
        option.value = player;
        option.textContent = `${player}（已提交）`;
        lurkerSelect.appendChild(option);
      }
    });

    if (lurkerSelect.options.length === 1) {
      lurkerStatus.textContent = "⚠️ 尚無可選擇的對象（可能還未交卡）";
    }
  } catch (err) {
    console.error("❌ 潛伏者無法取得任務卡列表", err);
  }
}

lurkerBtn.addEventListener("click", async () => {
  const selected = lurkerSelect.value;
  lurkerStatus.textContent = "";

  if (!selected) {
    lurkerStatus.textContent = "請選擇要反轉的玩家。";
    return;
  }

  try {
    const res = await fetch(`/api/skill/lurker-toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerName, targetName: selected })
    });

    if (res.ok) {
       showImmersiveForRole(myRole); // ← 新增這行：影武者用完當回合就顯示敘事
      lurkerStatus.textContent = "✅ 技能使用成功，該玩家卡片屬性已反轉";
      lurkerBtn.disabled = true;
      lurkerSelect.disabled = true;
    } else {
      const errMsg = await res.text();
      lurkerStatus.textContent = "❌ 使用失敗：" + errMsg;
    }
  } catch (err) {
    lurkerStatus.textContent = "❌ 發送請求錯誤：" + err;
  }
});

// ✅ 指揮官
async function fetchCommanderTargets() {
  try {
    const res = await fetch(`/api/room/${roomId}`);
    const room = await res.json();
    const players = room.players || [];

    commanderSelect.innerHTML = `<option value="">-- 請選擇要查看的玩家 --</option>`;
    players.forEach(p => {
      if (p !== playerName) {
        const option = document.createElement("option");
        option.value = p;
        option.textContent = p;
        commanderSelect.appendChild(option);
      }
    });
  } catch (err) {
    console.error("❌ 無法取得玩家列表", err);
  }
}

commanderBtn.addEventListener("click", async () => {
  const selected = commanderSelect.value;
  commanderResult.textContent = "";

  if (!selected) {
    commanderResult.textContent = "請先選擇玩家";
    return;
  }

  try {
    const res = await fetch("/api/skill/commander-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerName, targetName: selected })
    });

    if (res.ok) {
       showImmersiveForRole(myRole); // ← 新增這行：影武者用完當回合就顯示敘事
      const data = await res.json();
      commanderResult.textContent = `🔍 ${selected} 的陣營是：${data.faction}（剩餘次數：${data.remaining}）`;
      commanderBtn.disabled = true;
      commanderSelect.disabled = true;
    } else {
      const errMsg = await res.text();
      commanderResult.textContent = `❌ 錯誤：${errMsg}`;
    }
  } catch (err) {
    commanderResult.textContent = "❌ 發送請求失敗：" + err;
  }
});

// ✅ 破壞者
async function fetchSaboteurTargets() {
  try {
    const res = await fetch(`/api/room/${roomId}`);
    const room = await res.json();
    const cardMap = room.missionResults?.[room.currentRound]?.cardMap || {};
    const usedMap = room.usedSkillMap || {};

    if (usedMap[playerName]) {
      saboteurStatus.textContent = "❗ 你已使用過技能，無法再次使用。";
      saboteurBtn.disabled = true;
      saboteurSelect.disabled = true;
      return;
    }

    saboteurSelect.innerHTML = `<option value="">-- 選擇要破壞的玩家 --</option>`;
    Object.keys(cardMap).forEach(name => {
      if (name !== playerName) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name}（${cardMap[name]}）`;
        saboteurSelect.appendChild(option);
      }
    });
  } catch (err) {
    saboteurStatus.textContent = "❌ 無法取得可破壞對象";
  }
}

saboteurBtn.addEventListener("click", async () => {
  const selected = saboteurSelect.value;
  saboteurStatus.textContent = "";

  if (!selected) {
    saboteurStatus.textContent = "請選擇要破壞的對象。";
    return;
  }

  try {
    const res = await fetch("/api/skill/saboteur-nullify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerName, targetName: selected })
    });

    if (res.ok) {
       showImmersiveForRole(myRole); // ← 新增這行：影武者用完當回合就顯示敘事
      const data = await res.json();
      saboteurStatus.textContent = `🧨 已使 ${selected} 的卡片 (${data.removed}) 失效！剩餘次數 ${data.remaining}`;
      saboteurBtn.disabled = true;
      saboteurSelect.disabled = true;
    } else {
      const errMsg = await res.text();
      saboteurStatus.textContent = "❌ 破壞失敗：" + errMsg;
    }
  } catch (err) {
    saboteurStatus.textContent = "❌ 發送請求失敗：" + err;
  }
});

  // ✅ 醫護兵：載入目標
  async function fetchMedicTargets() {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const room = await res.json();
      const players = room.players || [];
      const usedMap = room.medicSkillUsed || {};

      if (usedMap[playerName]) {
        medicStatus.textContent = "❗ 你已使用過技能，無法再次使用。";
        medicBtn.disabled = true;
        medicSelect.disabled = true;
        return;
      }

      medicSelect.innerHTML = `<option value="">-- 選擇要保護的玩家 --</option>`;
      players.forEach(p => {
        if (p !== playerName) {
          const option = document.createElement("option");
          option.value = p;
          option.textContent = p;
          medicSelect.appendChild(option);
        }
      });
    } catch (err) {
      console.error("❌ 醫護兵無法取得玩家列表", err);
    }
  }

  medicBtn.addEventListener("click", async () => {
    const selected = medicSelect.value;
    medicStatus.textContent = "";

    if (!selected) {
      medicStatus.textContent = "請選擇要保護的玩家。";
      return;
    }

    try {
      const res = await fetch(`/api/skill/medic-protect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerName, targetName: selected })
      });

      if (res.ok) {
         showImmersiveForRole(myRole); // ← 新增這行：影武者用完當回合就顯示敘事
        medicStatus.textContent = `🛡️ 已成功保護 ${selected}（整場限一次）`;
        medicBtn.disabled = true;
        medicSelect.disabled = true;
      } else {
        const errMsg = await res.text();
        medicStatus.textContent = "❌ 發動失敗：" + errMsg;
      }
    } catch (err) {
      medicStatus.textContent = "❌ 發送請求錯誤：" + err;
    }
  });

  // ✅ 影武者
  async function fetchShadowTargets() {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const room = await res.json();
      const players = room.players || [];
      const used = room.shadowSkillCount?.[playerName] || 0;
      const usedThisRound = room.shadowUsedThisRound?.includes(playerName);

      if (used >= 2) {
        shadowStatus.textContent = "❗ 你已用完兩次技能";
        shadowSelect.disabled = true;
        shadowBtn.disabled = true;
        return;
      }
      if (usedThisRound) {
        shadowStatus.textContent = "❗ 本回合已使用過技能";
        shadowSelect.disabled = true;
        shadowBtn.disabled = true;
        return;
      }

      shadowSelect.innerHTML = `<option value="">-- 選擇要封鎖的玩家 --</option>`;
      players.forEach(p => {
        if (p !== playerName) {
          const option = document.createElement("option");
          option.value = p;
          option.textContent = p;
          shadowSelect.appendChild(option);
        }
      });
    } catch (err) {
      console.error("❌ 影武者無法取得資料", err);
    }
  }

  shadowBtn.addEventListener("click", async () => {
    const target = shadowSelect.value;
    if (!target) {
      shadowStatus.textContent = "請選擇要封鎖的玩家";
      return;
    }

    try {
      const res = await fetch("/api/skill/shadow-disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerName, targetName: target })
      });

      if (res.ok) {
         showImmersiveForRole(myRole); // ← 新增這行：影武者用完當回合就顯示敘事
        shadowStatus.textContent = `❌ ${target} 下一回合無法發動技能`;
        shadowBtn.disabled = true;
        shadowSelect.disabled = true;
      } else {
        const msg = await res.text();
        shadowStatus.textContent = "❌ 發動失敗：" + msg;
      }
    } catch (err) {
      console.error("❌ 發送錯誤", err);
    }
  });



// ✅ 倒數計時器
async function startCountdown(seconds) {
  const timerDisplay = document.getElementById("timer-value");
  let remaining = seconds;

  const interval = setInterval(async () => {
    timerDisplay.textContent = remaining;
    remaining--;

    if (remaining < 0) {
      clearInterval(interval);
      try {
        await fetch(`/api/room/${roomId}/skill-finish`, { method: "POST" });
      } catch (err) {
        console.error("❌ 無法通知技能階段結束", err);
      }
      window.location.href = `/game-front-page.html?roomId=${roomId}`;
    }
  }, 1000);
}
// —— 平民終極技能：載入所有玩家下拉 —— //
async function fetchCivilianUltimateTargets() {
  try {
    const res = await fetch(`/api/room/${roomId}`);
    const room = await res.json();
    const container = document.getElementById("civilian-ultimate-guess");
    if (!container) return; // HTML 尚未插入就跳過

    container.innerHTML = "";
    (room.players || []).forEach(p => {
      if (p !== playerName) {
        const wrap = document.createElement("div");
        wrap.style.margin = "6px 0";

        const label = document.createElement("label");
        label.textContent = `${p}：`;

        const sel = document.createElement("select");
        sel.id = `guess-${p}`;
        sel.innerHTML = `
          <option value="">-- 選擇陣營 --</option>
          <option value="good">好人</option>
          <option value="evil">壞人</option>
        `;
        sel.style.marginLeft = "8px";

        wrap.appendChild(label);
        wrap.appendChild(sel);
        container.appendChild(wrap);
      }
    });
  } catch (err) {
    console.error("❌ 終極技能名單載入失敗", err);
  }
}

// —— 平民終極技能：提交猜測 —— //
(function bindCivilianUltimateSubmitOnce() {
  // 若 HTML 尚未插入，這裡不會綁定；等進面板顯示時再由 fetchCivilianUltimateTargets 補上內容
  const btn = document.getElementById("use-civilian-ultimate-btn");
  const statusEl = document.getElementById("civilian-ultimate-status");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const resRoom = await fetch(`/api/room/${roomId}`);
      const room = await resRoom.json();
      const guesses = {};
      let allChosen = true;

      (room.players || []).forEach(p => {
        if (p !== playerName) {
          const sel = document.getElementById(`guess-${p}`);
          const val = sel ? sel.value : "";
          if (!val) allChosen = false;
          guesses[p] = val;
        }
      });

      if (!allChosen) {
        if (statusEl) statusEl.textContent = "⚠️ 每個人都要選完。";
        return;
      }

      const res = await fetch("/api/skill/civilian-ultimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerName, guesses })
      });

      if (res.ok) {
        const data = await res.json();
        if (statusEl) statusEl.textContent = data.message || "已提交。";
        btn.disabled = true;
      } else {
        const err = await res.text();
        if (statusEl) statusEl.textContent = "❌ 發動失敗：" + err;
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = "❌ 發送錯誤：" + err;
    }
  });
})();


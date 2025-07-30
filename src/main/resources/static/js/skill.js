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

  if (myRole === "潛伏者") await fetchLurkerTargets();
  if (myRole === "指揮官") await fetchCommanderTargets();
  if (myRole === "破壞者") await fetchSaboteurTargets();
  if (myRole === "醫護兵") await fetchMedicTargets();
  if (myRole === "影武者") await fetchShadowTargets();

  connectSkillPhase();
  startCountdown(20);
});

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
          skillMsg.textContent = "你不是技能角色，請等待技能階段結束...";
          waitingPanel.classList.remove("hidden");
          skillPanel.classList.add("hidden");
        }
      });
  });
}

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
      lurkerStatus.textContent = "✅ 技能使用成功，該玩家卡片屬性已反轉";
      lurkerBtn.disabled = true;
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
      const data = await res.json();
      saboteurStatus.textContent = `🧨 已使 ${selected} 的卡片 (${data.removed}) 失效！剩餘次數 ${data.remaining}`;
      saboteurBtn.disabled = true;
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

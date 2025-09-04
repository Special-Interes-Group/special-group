// /js/card-flip.js
(() => {
  // 角色簡要提示（用於翻面的標題/備援）
  const roleTips = {
    "工程師": { title: "工程師", text: "每回合開始時可查看成功/失敗各自的數量。（每回合可用）" },
    "醫護兵": { title: "醫護兵", text: "指定一名玩家保護，被保護者下一回合不受邪惡技能影響；保護到好人成功+1，保護到壞人成功-1。（限用一次）" },
    "指揮官": { title: "指揮官", text: "可檢查他人陣營是正義/邪惡；影武者被查為正義。（限用兩次）" },
    "普通倖存者": { title: "普通倖存者", text: "無主動技能，但可透過推理影響局勢。" },
    "潛伏者": { title: "潛伏者", text: "提交資源卡時可替換一張卡的屬性（成功↔失敗）。（限用一次）" },
    "破壞者": { title: "破壞者", text: "可使一張已提交的任務卡失效（成功或失敗皆可）。（限用兩次）" },
    "影武者": { title: "影武者", text: "指定某玩家下一回合發動的技能失效（限用兩次）。被指揮官查到時顯示為正義。" },
    "邪惡平民": { title: "邪惡平民", text: "無主動技能，透過推理與行動協助壞方。" },
    // 英文鍵（保險）
    "engineer": { title: "工程師", text: "每回合開始時可查看成功/失敗各自的數量。（每回合可用）" },
    "medic": { title: "醫護兵", text: "指定一名玩家保護，被保護者下一回合不受邪惡技能影響；保護到好人成功+1，保護到壞人成功-1。（限用一次）" },
    "commander": { title: "指揮官", text: "可檢查他人陣營是正義/邪惡；影武者被查為正義。（限用兩次）" },
    "lurker": { title: "潛伏者", text: "提交資源卡時可替換一張卡的屬性（成功↔失敗）。（限用一次）" },
    "saboteur": { title: "破壞者", text: "可使一張已提交的任務卡失效（成功或失敗皆可）。（限用兩次）" },
    "shadow": { title: "影武者", text: "指定某玩家下一回合發動的技能失效（限用兩次）。被指揮官查到時顯示為正義。" },
    "civilian-good": { title: "普通倖存者", text: "無主動技能，但可透過推理影響局勢。" },
    "civilian-bad": { title: "邪惡平民", text: "無主動技能，透過推理與行動協助壞方。" },
    "civilian": { title: "普通倖存者", text: "無主動技能，但可透過推理影響局勢。" }
  };

  // 翻面後的大型資訊板內容（左：卡牌與介紹；右：技能效果＋提示）
  const roleDetails = {
    "engineer": {
      intro: "在廢墟與謊言的世界裡，偵探是唯一能追尋真相的人。他們蒐集細碎的線索，拆解人心的謊言，試圖在黑暗中還原光明。",
      effects: [
        "每回合可查看任務成功/失敗的張數總覽（不含身份）。",
        "資訊僅對自己可見，請把握時機與隊友分享。"
      ],
      tips: [
        "觀察總趨勢：是否有人持續提交失敗？",
        "遇到影武者干擾時，必要時保留關鍵回合資訊。"
      ]
    },
    "medic": {
      intro: "戰火與絕望中最後的希望。他們的雙手既治癒傷口，也承載著守護的誓言。即使自身搖搖欲墜，他們仍選擇將生命賭在同伴身上。",
      effects: [
        "指定一名玩家保護一次（整場限一次）。",
        "若該玩家下回合出戰，則不受邪惡技能影響。"
      ],
      tips: [
        "優先保護你最信任且常被鎖定的人。",
        "若誤保壞人會扣分，請謹慎決策。"
      ]
    },
    "saboteur": {
      intro: "行走於陰影，他們不創造，只摧毀。對他們而言，混亂即是生存的沃土，每一個瓦解的計畫，都是他們暗中播下的毒種",
      effects: [
        "整場限兩次，可選擇使一張卡失效。",
        "對結果邊緣的回合影響最大。"
      ],
      tips: [
        "不要太早亮招，等到關鍵分數再出手。",
        "若被看穿，改用威懾讓對手自亂陣腳。"
      ]
    },
    "shadow": {
      intro: "影武者存在於光與影的縫隙。他們的身分模糊不清，有人說他們是墮落的英雄，也有人相信他們是最後的審判者。他們的刀鋒，無聲卻致命。",
      effects: [
        "指定一名玩家，使其下一回合發動的技能失效（限兩次）。",
        "若被封鎖者未使用技能，則只封鎖一回合。"
      ],
      tips: [
        "抓準時機封鎖工程師或醫護兵，最大化影響。",
        "避免重複封鎖同一人被預測，分散風險。"
      ]
    },
    "lurker": {
      intro: "隱身於人群之中，他們的存在如同耳語般微弱，卻足以改變結果。他們不追求榮耀，只在關鍵時刻扭轉命運的天平。",
      effects: [
        "每場限用一次，將己方或他方的卡反轉。",
        "適合用在關鍵回合或平衡點。"
      ],
      tips: [
        "搭配隊友出牌節奏，創造出其不意的逆轉。",
        "別浪費在勝負已定的回合。"
      ]
    },
    "commander": {
      intro: "背負的不只是權力，而是眾人寄託的信念。在廢墟之上，他們的決斷可能是救贖，也可能是毀滅。他們的眼神比刀鋒更銳利。",
      effects: [
        "整場限用兩次，查驗指定玩家的陣營。",
        "影武者特性：被查為正義。"
      ],
      tips: [
        "被你查為正義也不一定可靠，小心影武者。",
        "善用兩次機會建立可信網絡。"
      ]
    },
    "civilian-good": {
      intro: "在這個殘酷的世界裡，普通倖存者沒有天賦異能，沒有強大的力量。他們唯一的武器是信任與勇氣，卻往往成為改變戰局的關鍵。",
      effects: [
        "專注於投票、談話與行為觀察。",
        "協助識破壞方的節奏。"
      ],
      tips: [
        "記錄每回合表決與結果的對應關係。",
        "多問關鍵問題，觀察回答細節。"
      ]
    },
    "civilian-bad": {
      intro: "沒有明顯的面具，他們隱藏在人群中，以微笑掩飾真相。他們的力量來自於欺瞞，讓正義在懷疑中自我崩解。",
      effects: [
        "配合隊友的技能造成混亂。",
        "把握表決與出戰機會。"
      ],
      tips: [
        "避免早早暴露自己，多以模稜兩可的語句影響局勢。",
        "關鍵回合再出手，效果更佳。"
      ]
    },
    "civilian": { intro: "一般平民角色。", effects: ["—"], tips: ["—"] }
  };

  // ★ 依職業顯示不同圖片（請把這些路徑換成你的實際檔名）
  const roleImages = {
    "engineer": "/images/full-engineer.png",
    "medic": "/images/full-medic.png",
    "saboteur": "/images/full-saboteur.png",
    "shadow": "/images/full-shadow.png",
    "lurker": "/images/full-lurker.png",
    "commander": "/images/full-commander.png",
    "civilian-good": "/images/full-civilian-good.png",
    "civilian-bad": "/images/full-civilian-bad.png",
    "civilian": "/images/full-civilian.png"
  };

  const CARD_SELECTOR = ".player-self"; // 只包自己的卡

  // 取得實際 CSS 寬高（避免 rect 因 transform/縮放造成偏差）
  function getCssSize(el) {
    const cs = getComputedStyle(el);
    const w = parseFloat(cs.width) || el.offsetWidth;
    const h = parseFloat(cs.height) || el.offsetHeight;
    return { w, h, cs };
  }

  function copyDatasetAndClasses(from, to) {
    from.classList.forEach(c => to.classList.add(c)); // 複製 class
    for (const [k, v] of Object.entries(from.dataset)) to.dataset[k] = v; // 複製 data-*
  }

  // 建立置中大型資訊板（並回傳 overlay 節點）
  function buildOverlay(roleKey, cardEl, tip) {
    const d = roleDetails[roleKey] || roleDetails["civilian"];
    const overlay = document.createElement("div");
    overlay.className = "roleflip-overlay";
    overlay.innerHTML = `
      <div class="roleflip-panel" role="dialog" aria-modal="true">
        <div class="roleflip-panel-header">
          <div class="roleflip-title">${tip.title}</div>
          <button class="roleflip-close" aria-label="關閉">×</button>
        </div>
        <div class="roleflip-panel-body">
          <div class="roleleft">
            <div class="role-card-preview"></div>
            <div class="role-intro">
              <h3>角色介紹</h3>
              <p>${d.intro}</p>
            </div>
          </div>
          <div class="roleright">
            <div class="role-section">
              <h3>技能效果</h3>
              <ul>${(d.effects || []).map(s => `<li>${s}</li>`).join("")}</ul>
            </div>
            <div class="role-section">
              <h3>技能提示</h3>
              <ul>${(d.tips || []).map(s => `<li>${s}</li>`).join("")}</ul>
            </div>
          </div>
        </div>
      </div>
    `;

    // 左欄：若有設定職業大圖，優先顯示；否則退回 clone 小卡
    const previewHost = overlay.querySelector(".role-card-preview");
    const imgSrc = roleImages[roleKey];
    if (imgSrc) {
      const previewImg = document.createElement("img");
      previewImg.src = imgSrc;
      previewImg.alt = tip.title;
      previewImg.style.maxWidth = "100%";
      previewImg.style.height = "auto";
      previewImg.style.display = "block";
      previewImg.style.borderRadius = "12px";
      previewHost.appendChild(previewImg);
    } else {
      const clone = cardEl.cloneNode(true);
      clone.classList.remove("is-wrapped"); // 清掉包裝痕跡
      clone.style.left = clone.style.top =
        clone.style.right = clone.style.bottom = "auto";
      clone.style.transform = "none";
      previewHost.appendChild(clone);
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-open")); // 開啟動畫

    // 關閉邏輯：關閉 overlay 同時翻回卡牌正面
    const close = () => {
      overlay.classList.remove("is-open");
      setTimeout(() => overlay.remove(), 140);
      cardEl.closest(".roleflip-card")?.classList.remove("is-flipped");
      document.removeEventListener("keydown", escHandler);
    };
    overlay.querySelector(".roleflip-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const escHandler = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", escHandler);

    return overlay;
  }

  function wrapCard(cardEl) {
    if (cardEl.closest(".roleflip-card")) return;

    // 優先讀英文鍵，其次中文名，最後備援
    const roleKey =
      cardEl.getAttribute("data-roleKey") ||
      cardEl.getAttribute("data-role") ||
      cardEl.getAttribute("data-roleName") ||
      "civilian";
    const tip = roleTips[roleKey] || { title: roleKey, text: "—" };

    // 讀 CSS 寬高與目前 inline 定位
    const { w, h, cs } = getCssSize(cardEl);

    // 外層容器：沿用原卡 inline 的 left/top/right/bottom/transform/zIndex
    const wrapper = document.createElement("div");
    wrapper.className = "roleflip-card";
    wrapper.style.position = "absolute";
    wrapper.style.width = w + "px";
    wrapper.style.height = h + "px";
    ["left","top","right","bottom","transform","zIndex"].forEach(k => {
      const v = cardEl.style[k];
      if (v) wrapper.style[k === "zIndex" ? "zIndex" : k] = v;
    });
    const br = cs.borderRadius;
    if (br && br !== "0px") wrapper.style.borderRadius = br;

    // 內層 / 正反面
    const inner = document.createElement("div");
    inner.className = "roleflip-inner";

    const front = document.createElement("div");
    front.className = "roleflip-front";

    const back = document.createElement("div");
    back.className = "roleflip-back";
    back.innerHTML = `
      <div class="roleflip-tip">
        <h4>${tip.title}</h4>
        <p>${tip.text}</p>
      </div>
    `;

    // 把 wrapper 放到原位置，並把原卡移進 front
    cardEl.parentNode.insertBefore(wrapper, cardEl);
    // 讓原卡填滿 front（避免外層尺寸錯亂）
    cardEl.classList.add("is-wrapped");
    cardEl.style.left = "0px";
    cardEl.style.top = "0px";
    cardEl.style.right = "auto";
    cardEl.style.bottom = "auto";
    cardEl.style.transform = "none";

    // 同步 class/data 到背面，讓外框 ::before 也能吃到
    copyDatasetAndClasses(cardEl, back);

    front.appendChild(cardEl);
    inner.appendChild(front);
    inner.appendChild(back);
    wrapper.appendChild(inner);

    // 互動（只給自己的卡）
    let openOverlay = null;
    const toggle = () => {
      const willFlip = !wrapper.classList.contains("is-flipped");
      wrapper.classList.toggle("is-flipped");

      if (willFlip) {
        // 翻到背面 → 顯示置中資訊板
        const rk =
          cardEl.getAttribute("data-roleKey") ||
          cardEl.getAttribute("data-role") ||
          cardEl.getAttribute("data-roleName") ||
          "civilian";
        const tip2 = roleTips[rk] || { title: rk, text: "—" };
        openOverlay = buildOverlay(rk, cardEl, tip2);
      } else {
        // 翻回正面 → 關閉資訊板
        const ov = openOverlay;
        openOverlay = null;
        ov?.querySelector(".roleflip-close")?.click();
      }
    };

    wrapper.addEventListener("click", toggle);
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", "可翻轉卡牌（Enter/空白翻面，Esc 關閉）");
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") {
        wrapper.classList.remove("is-flipped");
      }
    });
  }

  function roleFlipWrapNewCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(wrapCard);
  }

  document.addEventListener("DOMContentLoaded", roleFlipWrapNewCards);
  window.roleFlipWrapNewCards = roleFlipWrapNewCards;
})();

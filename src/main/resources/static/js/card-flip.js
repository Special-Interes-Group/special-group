// /js/card-flip.js
(() => {
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

  // 只包自己的卡（避免翻別人的）
  const CARD_SELECTOR = ".player-self";

  // 取得實際 CSS 寬高（避免 rect 因 transform/縮放造成偏差）
  function getCssSize(el) {
    const cs = getComputedStyle(el);
    const w = parseFloat(cs.width) || el.offsetWidth;
    const h = parseFloat(cs.height) || el.offsetHeight;
    return { w, h, cs };
  }

  function copyDatasetAndClasses(from, to) {
    // 複製 class（讓 ::before 外框規則也能套在背面）
    from.classList.forEach(c => to.classList.add(c));
    // 複製 data-*（例如 data-role / data-roleKey）
    for (const [k, v] of Object.entries(from.dataset)) {
      to.dataset[k] = v;
    }
  }

  function wrapCard(cardEl) {
    if (cardEl.closest(".roleflip-card")) return;

    // 角色鍵
    const roleKey = cardEl.getAttribute("data-role") || cardEl.getAttribute("data-roleKey") || "普通倖存者";
    const tip = roleTips[roleKey] || { title: roleKey, text: "—" };

    // 讀 CSS 寬高與目前 inline 定位
    const { w, h, cs } = getCssSize(cardEl);

    // 外層容器：沿用原卡 inline 的 left/top/right/bottom/transform/zIndex
    const wrapper = document.createElement("div");
    wrapper.className = "roleflip-card";
    wrapper.style.position = "absolute";
    wrapper.style.width = w + "px";
    wrapper.style.height = h + "px";
    // 從 inline style 搬位置（你的 renderPlayers 是用 inline 指定位置的）
    ["left","top","right","bottom","transform","zIndex"].forEach(k => {
      const v = cardEl.style[k];
      if (v) wrapper.style[k === "zIndex" ? "zIndex" : k] = v;
    });
    // 邊角跟著
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
    const toggle = () => wrapper.classList.toggle("is-flipped");
    wrapper.addEventListener("click", toggle);
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("aria-label", "可翻轉卡牌（Enter/空白翻面，Esc 關閉）");
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") { wrapper.classList.remove("is-flipped"); }
    });
  }

  function roleFlipWrapNewCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(wrapCard);
  }

  document.addEventListener("DOMContentLoaded", roleFlipWrapNewCards);
  window.roleFlipWrapNewCards = roleFlipWrapNewCards;
})();

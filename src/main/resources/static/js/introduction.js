// 角色資訊列表
const characters = [
    { img: "/images/goodpeople1.png", info: " 偵查者<br>每回合開始時可以查看成功跟失敗各自的數量<br>(本技能可以每回合使用)。" },
    { img: "/images/goodpeople2.png", info: " 醫護兵<br>指定一名玩家保護<br>被保護者下一回合不受邪惡方的技能影響<br>若保護到好人成功數+1,反之保護到壞人成功-1<br>(本技能可以使用一次)" },
    { img: "/images/goodpeople3.png", info: " 指揮官<br>可以檢查他人的陣營是正義還是邪惡<br>影武者被查到時會是正義方<br>(本技能可以使用兩次)" },
    { img: "/images/goodpeople4.png", info: " 普通倖存者<br>無特殊能力<br>透過推理與投票影響遊戲。" },
    { img: "/images/badpeople1.png", info: " 潛伏者<br>可以在提交資源卡時決定替換一張卡片的屬性<br>成功卡變為失敗卡,失敗卡變為成功卡<br>(本技能可以使用一次)<br>若與潛伏者在同回合對同張卡發動技能<br>以破壞者優先" },
    { img: "/images/badpeople2.png", info: " 破壞者<br> 可選擇一張提交的成功卡或失敗卡使其失效<br>(本技能可以使用兩次)<br>若與潛伏者在同回合對同張卡發動技能<br>以破壞者優先" },
    { img: "/images/badpeople3.png", info: " 影武者<br>指定某玩家下一回合發動的技能失效<br>(本技能可以使用兩次)<br>被指揮官查到時會是正義方" },
    { img: "/images/badpeople4.png", info: " 邪惡平民<br>無特殊能力<br>但可協助邪惡方勝利。" }
];

// ✅ 確保變數先定義，避免 `window.onload` 時 `currentIndex` 未定義
let currentIndex = 0;

// ✅ `window.onload` 內部先檢查 `#character-info` 是否存在，避免 `null` 錯誤
window.onload = function () {
    const characterInfo = document.querySelector("#character-info");
    const characterImg = document.querySelector("#character-card img");

    if (characterInfo && characterImg) {
        characterInfo.innerHTML = characters[currentIndex].info;
        characterImg.src = characters[currentIndex].img;
    }

    // 綁定按鈕事件，確保 DOM 載入後才執行
    document.querySelector(".left-btn").addEventListener("click", prevCard);
    document.querySelector(".right-btn").addEventListener("click", nextCard);
};

// 更新角色卡片
function updateCard() {
    const card = document.getElementById("character-card");
    card.style.transform = "scale(0.8)"; // 縮小
    setTimeout(() => {
        document.querySelector("#character-card img").src = characters[currentIndex].img;
        document.querySelector("#character-info").innerHTML = characters[currentIndex].info; // 使用 innerHTML 解析 <br>
        card.style.transform = "scale(1)"; // 放大
    }, 300);
}

// 切換到下一個角色
function nextCard() {
    currentIndex = (currentIndex + 1) % characters.length;
    updateCard();
}

// 切換到上一個角色
function prevCard() {
    currentIndex = (currentIndex - 1 + characters.length) % characters.length;
    updateCard();
}

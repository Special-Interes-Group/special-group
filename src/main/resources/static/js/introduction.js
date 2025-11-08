const images = [
  "/images/a1.png",
  "/images/a2.png",
  "/images/a3.png",
  "/images/a4.png",
  "/images/a5.png",
  "/images/a6.png",
  "/images/a7.png",
  "/images/a8new.png",
];

// 每張圖片對應的文字說明（如果沒有就留空字串）
const captions = [
  "", // a1
  "", // a2
  "", // a3
  "", // a4
  // a5 的文字
  `和破壞者在同回合對同張卡片發動技能<br>
若破壞者先發動技能，會因卡片被破壞而無法反轉卡片<br>
若自己先發動技能則可以成功反轉，但卡片會被破壞掉。`,
  // a6 的文字
  `和潛伏者在同回合對同張卡片發動技能<br>
以我方技能優先（即可以破壞卡片）`,
  "", // a7
  ""  // a8
];

let currentIndex = 0;

window.addEventListener("DOMContentLoaded", () => {
  const imgEl = document.getElementById("gallery-img");
  const captionEl = document.getElementById("image-caption"); // ✅ 用來放說明文字
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");

  if (!imgEl || !leftBtn || !rightBtn) {
    console.error("找不到圖片或按鈕元素");
    return;
  }

  const updateImage = () => {
    imgEl.style.opacity = "0";
    captionEl.style.opacity = "0";
    setTimeout(() => {
      imgEl.src = images[currentIndex];
      captionEl.innerHTML = captions[currentIndex] || ""; // ✅ 顯示對應文字
      imgEl.style.opacity = "1";
      captionEl.style.opacity = "1";
    }, 200);
  };

  updateImage();

  leftBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateImage();
  });

  rightBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    updateImage();
  });
});

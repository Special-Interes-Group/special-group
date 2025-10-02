async function getPasswordHint() {
  const username = document.getElementById("username").value;
  const hintMsg = document.getElementById("hint-message");

  if (!username) {
    hintMsg.textContent = "⚠️ 請輸入帳號名稱";
    return;
  }

  try {
    const res = await fetch(`/auth/password-hint?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("查詢失敗");
    const data = await res.json();
    hintMsg.textContent = "您的密碼提示：" + data.hint;

    // 顯示修改密碼區塊
    document.getElementById("step2").style.display = "block";
  } catch (err) {
    hintMsg.textContent = "❌ 查無此帳號";
  }
}

async function changePassword() {
  const username = document.getElementById("username").value;
  const newPassword = document.getElementById("new-password").value;
  const updateMsg = document.getElementById("update-message");

  if (!newPassword) {
    updateMsg.textContent = "⚠️ 請輸入新密碼";
    return;
  }

  try {
    const res = await fetch(`/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, newPassword })
    });
    if (!res.ok) throw new Error("修改失敗");
    updateMsg.textContent = "✅ 密碼修改成功！請返回登入頁重新登入";
  } catch (err) {
    updateMsg.textContent = "❌ 修改密碼失敗";
  }
}


// =============== 共用：帳號格式驗證（只允許英文與數字） ===============
function validateUsername(username) {
  const regex = /^[A-Za-z0-9]+$/;
  return regex.test(username);
}

// 顯示註冊表單
function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

// 顯示登入表單
function showLoginForm() {
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

// =============== 註冊（送出前先驗證帳號格式） ===============
function register() {
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !password) {
    alert("請輸入帳號和密碼！");
    return;
  }

  // ✅ 前端先擋：只允許英文與數字
  if (!validateUsername(username)) {
    alert("帳號名請由數字及英文組成，請勿包含符號或空白！");
    return;
  }

  fetch('/auth/do-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => {
    if (!response.ok) throw new Error('網路錯誤或伺服器錯誤');
    return response.json();
  })
  .then(data => {
    alert(data.message || (data.success ? "註冊成功！" : "註冊失敗！"));
    if (data.success) {
      showLoginForm();
    }
  })
  .catch(error => {
    console.error("註冊錯誤:", error);
    alert("註冊過程出錯");
  });
}

// =============== 登入（建議也驗證一下，避免舊資料帶入） ===============
function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    alert("請輸入帳號和密碼！");
    return;
  }

  // 🔒 前端同步規範：與註冊一致
  if (!validateUsername(username)) {
    alert("帳號名請由數字及英文組成，請勿包含符號或空白！");
    return;
  }

  fetch('/auth/do-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => {
    if (!response.ok) throw new Error("伺服器錯誤");
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // ✅ 僅在登入成功後才寫入（修正原本提早寫入的問題）
      localStorage.setItem("username", username);
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("playerName", username);

      alert("登入成功！");
      window.location.href = '/game-lobby';
    } else {
      alert(data.message || "登入失敗！");
    }
  })
  .catch(error => {
    console.error("登入錯誤:", error);
    alert("登入過程出錯");
  });
}


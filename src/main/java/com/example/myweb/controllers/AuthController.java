package com.example.myweb.controllers;

import com.example.myweb.models.User;
import com.example.myweb.repositories.UserRepository;
import com.example.myweb.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    // ================= 註冊 =================
    @PostMapping("/auth/do-register")
    @ResponseBody
    public Map<String, Object> register(@RequestBody User user) {
        String username = user.getUsername();
        String password = user.getPassword();

        Map<String, Object> response = new HashMap<>();

        // 🔍 帳號格式驗證：只允許英文與數字
        if (!username.matches("^[A-Za-z0-9]+$")) {
            response.put("success", false);
            response.put("message", "帳號名請由數字及英文組成，請勿包含符號或空白！");
            return response;
        }

        boolean success = userService.register(username, password);

        if (success) {
            response.put("success", true);
            response.put("message", "註冊成功！");
        } else {
            response.put("success", false);
            response.put("message", "帳號已存在！");
        }
        return response;
    }


    // ================= 登入 =================
    @PostMapping("/auth/do-login")
    @ResponseBody
    public Map<String, Object> login(@RequestBody User user) {
        String username = user.getUsername();
        String password = user.getPassword();

        boolean success = userService.login(username, password);

        Map<String, Object> response = new HashMap<>();
        if (success) {
            response.put("success", true);
            response.put("message", "登入成功！");
        } else {
            response.put("success", false);
            response.put("message", "帳號或密碼錯誤！");
        }
        return response;
    }

    // ================= 登出 =================
    @GetMapping("/logout")
    public String logout(HttpServletRequest request) {
        request.getSession().invalidate();
        return "redirect:/";
    }

    // ================= 忘記密碼：取得提示 =================
    @GetMapping("/auth/password-hint")
    @ResponseBody
    public ResponseEntity<?> getPasswordHint(@RequestParam String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        String password = userOpt.get().getPassword();
        String hint = maskPassword(password);
        return ResponseEntity.ok(Map.of("hint", hint));
    }

    // ================= 忘記密碼：修改密碼 =================
    @PostMapping("/auth/change-password")
    @ResponseBody
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String newPassword = payload.get("newPassword");

        if (username == null || newPassword == null) {
            return ResponseEntity.badRequest().body("Missing parameters");
        }

        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = userOpt.get();
        user.setPassword(newPassword); // ⚠️ 這裡目前是明文，如果之後加密要修改
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    // 工具方法：遮蔽密碼 (僅保留首尾字元，中間換成 *)
    private String maskPassword(String password) {
        if (password == null || password.isEmpty()) {
            return "";
        }

        if (password.length() <= 2) {
            // 若長度小於等於2，就全部用 * 取代
            return "*".repeat(password.length());
        }

        int stars = password.length() - 2;
        return password.charAt(0) + "*".repeat(stars) + password.charAt(password.length() - 1);
    }

}

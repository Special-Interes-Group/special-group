/**
 * HomeController.java
 *
 * ▶ 此檔案負責整個系統中所有前端網頁的路由導向（Page Routing）。
 *
 * ▶ 功能總覽：
 *   - 對應各種前端頁面 URL，回傳對應的 HTML Template（由 Thymeleaf 或其他模板引擎渲染）
 *   - 包含首頁、遊戲大廳、創建房間、進入房間、角色介紹、投票頁等頁面
 *   - 支援 query string (`?roomId=...`) 與 path variable (`/game-start/{roomId}`) 的動態頁面
 *
 * ▶ 與此控制器互動的單元：
 *   - resources/templates/*.html 為每個對應的 HTML 模板檔案
 *   - 前端點選頁面超連結時會觸發這些 GetMapping
 *
 * ▶ 備註：
 *   若你要新增、修改、刪除前端畫面（例如新增一個說明頁），請在這裡加上新的 @GetMapping。
 */

package com.example.myweb.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class HomeController {
    @GetMapping("/game-start")
    public String gameStartQuery(@RequestParam String roomId) {
        return "game-front-page";   // 遊戲主畫面模板
    }

    @GetMapping("/game-start/{roomId}")
    public String gameStart(@PathVariable String roomId) {
        return "game-start";
    }

    @GetMapping("/")
    public String home() {
        return "index"; // 對應 resources/templates/index.html
    }

    @GetMapping("/about")
    public String about() {
        return "about"; // 對應 resources/templates/about.html
    }

    @GetMapping("/team")
    public String team() {
        return "team"; // 對應 resources/templates/team.html
    }

    @GetMapping("/game")
    public String game() {
        return "game"; // 對應 resources/templates/game.html
    }

    @GetMapping("/game-lobby")
    public String gameLobby() {
        return "game-lobby"; // 對應 resources/templates/game-lobby.html
    }

    @GetMapping("/create-room")
    public String createRoom() {
        return "create-room"; // 對應 resources/templates/create-room.html
    }

    @GetMapping("/join-room-selection")
    public String joinRoomSelection() {
        return "join-room-selection"; // 對應 resources/templates/join-room-selection.html
    }

    @GetMapping("/join-room-public")
    public String joinRoomPublic() {
        return "join-room-public"; // 對應 resources/templates/join-room-public.html
    }

    @GetMapping("/join-room-private")
    public String joinRoomPrivate() {
        return "join-room-private"; // 對應 resources/templates/join-room-private.html
    }

    @GetMapping("/room/{roomId}")
    public String getRoomPage(@PathVariable String roomId) {
        return "room";  // 返回 resources/templates/room.html
    }

    @GetMapping("/game-introduction")
    public String gameIntroduction() {
        return "game-introduction"; // 對應 resources/templates/game-introduction.html
    }

    @GetMapping("/character-introduction")
    public String characterIntroduction() {
        return "character-introduction"; // 對應 resources/templates/character-introduction.html
    }

    @GetMapping("/vote")
    public String vote() {
        return "vote";
    }
    @GetMapping("/game-records")
    public String gameRecordsPage() {
        return "redirect:/game-records.html";
    }
    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "forgot-password"; // 會對應到 templates/forgot-password.html
    }





    
}

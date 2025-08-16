package com.example.myweb.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "game_records")
public class GameRecord {

    @Id
    private String id;

    private String roomId;  // 🔹 新增欄位
    private LocalDateTime playDate;
    private int playerCount;
    private String result;
    private List<String> players;
    private Map<String, String> playerResults;

    private int successCount; // 🔹 建議補上成功數、失敗數，方便查詢
    private int failCount;

    // --- Getter & Setter ---
    public String getId() {
        return id;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public LocalDateTime getPlayDate() {
        return playDate;
    }

    public void setPlayDate(LocalDateTime playDate) {
        this.playDate = playDate;
    }

    public int getPlayerCount() {
        return playerCount;
    }

    public void setPlayerCount(int playerCount) {
        this.playerCount = playerCount;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public List<String> getPlayers() {
        return players;
    }

    public void setPlayers(List<String> players) {
        this.players = players;
    }

    public Map<String, String> getPlayerResults() {
        return playerResults;
    }

    public void setPlayerResults(Map<String, String> playerResults) {
        this.playerResults = playerResults;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public void setSuccessCount(int successCount) {
        this.successCount = successCount;
    }

    public int getFailCount() {
        return failCount;
    }

    public void setFailCount(int failCount) {
        this.failCount = failCount;
    }
}

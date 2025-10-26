package com.example.myweb.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "game_records")
public class GameRecord {

    @Id
    private String id;

    private String roomId;               // 房間 ID
    private LocalDateTime playDate;      // 遊戲時間
    private int playerCount;             // 玩家數
    private String result;               // 總體結果（例：正方勝利）
    private List<String> players = new ArrayList<>(); // 玩家列表

    /** ✅ 每位玩家的完整結果（角色、頭像、勝敗） */
    private Map<String, Map<String, Object>> playerResults = new HashMap<>();

    /** ✅ 紀錄任務成功 / 失敗數 */
    private int successCount;
    private int failCount;

    // === Getter / Setter ===
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public Map<String, Map<String, Object>> getPlayerResults() {
        return playerResults;
    }

    public void setPlayerResults(Map<String, Map<String, Object>> playerResults) {
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

    @Override
    public String toString() {
        return "GameRecord{" +
                "roomId='" + roomId + '\'' +
                ", playDate=" + playDate +
                ", playerCount=" + playerCount +
                ", result='" + result + '\'' +
                ", successCount=" + successCount +
                ", failCount=" + failCount +
                '}';
    }
}

package com.example.myweb.controllers;

import com.example.myweb.models.GameRecord;
import com.example.myweb.repositories.GameRecordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game-records")
public class GameRecordController {

    private final GameRecordRepository gameRecordRepository;

    public GameRecordController(GameRecordRepository gameRecordRepository) {
        this.gameRecordRepository = gameRecordRepository;
    }

    /**
     * ✅ 取得某玩家的總場數與勝率
     * 對應前端：fetch(`/api/game-records/stats/${playerName}`)
     */
    @GetMapping("/stats/{playerName}")
    public ResponseEntity<?> getPlayerStats(@PathVariable String playerName) {
        List<GameRecord> allRecords = gameRecordRepository.findAll();

        // 篩選該玩家參與的遊戲
        List<GameRecord> playerGames = allRecords.stream()
                .filter(r -> r.getPlayers() != null && r.getPlayers().contains(playerName))
                .toList();

        long totalGames = playerGames.size();
        long wins = 0;

        for (GameRecord r : playerGames) {
            Map<String, Map<String, Object>> results = r.getPlayerResults();
            if (results != null && results.containsKey(playerName)) {
                Object outcomeObj = results.get(playerName).get("outcome");
                if (outcomeObj != null && "勝利".equals(outcomeObj.toString())) {
                    wins++;
                }
            }
        }

        double winRate = totalGames > 0 ? (wins * 100.0 / totalGames) : 0.0;

        return ResponseEntity.ok(new StatsResponse(totalGames, wins, winRate));
    }

    /** ✅ 統計回傳格式 */
    record StatsResponse(long totalGames, long wins, double winRate) {}

    /**
     * ✅ 取得該玩家所有戰績紀錄
     * 對應前端：fetch(`/api/game-records/player/${playerName}`)
     */
    @GetMapping("/player/{playerName}")
    public ResponseEntity<?> getPlayerRecords(@PathVariable String playerName) {
        List<GameRecord> allRecords = gameRecordRepository.findAll();

        List<GameRecord> playerGames = allRecords.stream()
                .filter(r -> r.getPlayers() != null && r.getPlayers().contains(playerName))
                .toList();

        return ResponseEntity.ok(playerGames);
    }
}

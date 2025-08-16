package com.example.myweb.controllers;

import com.example.myweb.models.GameRecord;
import com.example.myweb.repositories.GameRecordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/game-records")
public class GameRecordController {

    private final GameRecordRepository gameRecordRepository;

    public GameRecordController(GameRecordRepository gameRecordRepository) {
        this.gameRecordRepository = gameRecordRepository;
    }

    // 取得某玩家的總場數與勝率
    @GetMapping("/stats/{playerName}")
    public ResponseEntity<?> getPlayerStats(@PathVariable String playerName) {
        List<GameRecord> allRecords = gameRecordRepository.findAll();

        // 篩選出該玩家參與的紀錄
        List<GameRecord> playerGames = allRecords.stream()
                .filter(r -> r.getPlayers().contains(playerName))
                .toList();

        long totalGames = playerGames.size();
        long wins = playerGames.stream()
                .filter(r -> "勝利".equals(r.getPlayerResults().get(playerName)))
                .count();

        double winRate = totalGames > 0 ? (wins * 100.0 / totalGames) : 0.0;

        return ResponseEntity.ok(new StatsResponse(totalGames, wins, winRate));
    }

    // 簡單的回傳結構
    record StatsResponse(long totalGames, long wins, double winRate) {}
    // 取得某玩家的所有戰績
    @GetMapping("/player/{playerName}")
    public ResponseEntity<?> getPlayerRecords(@PathVariable String playerName) {
        List<GameRecord> allRecords = gameRecordRepository.findAll();

        // 篩選出該玩家的紀錄
        List<GameRecord> playerGames = allRecords.stream()
                .filter(r -> r.getPlayers().contains(playerName))
                .toList();

        return ResponseEntity.ok(playerGames);
    }
}

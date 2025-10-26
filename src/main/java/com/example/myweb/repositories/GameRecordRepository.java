package com.example.myweb.repositories;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.myweb.models.GameRecord;

public interface GameRecordRepository extends MongoRepository<GameRecord, String> {

    /** ✅ 根據房間 ID 取得遊戲紀錄 */
    Optional<GameRecord> findByRoomId(String roomId);

    /** ✅ 檢查是否已存在該房間紀錄（防重複） */
    boolean existsByRoomId(String roomId);

    /** ✅ 根據玩家名稱查詢該玩家參與過的所有紀錄 */
    List<GameRecord> findByPlayersContaining(String playerName);
}


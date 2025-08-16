package com.example.myweb.repositories;

import com.example.myweb.models.GameRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GameRecordRepository extends MongoRepository<GameRecord, String> {
    Optional<GameRecord> findByRoomId(String roomId);  // 🔹 新增
}

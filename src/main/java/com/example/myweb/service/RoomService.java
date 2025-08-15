package com.example.myweb.service;

import com.example.myweb.models.Room;
import com.example.myweb.models.MissionRecord;
import com.example.myweb.repositories.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepo;

    @Autowired
    private SimpMessagingTemplate ws;

    public Room getRoomById(String roomId) {
        return roomRepo.findById(roomId).orElseThrow(() -> new RuntimeException("Room not found"));
    }

    /* ---------- 角色指派 & 領袖 ---------- */
    public Room assignRoles(String roomId) {
        Room room = getRoomById(roomId);

        if (room.getAssignedRoles() == null || room.getAssignedRoles().isEmpty()) {
            int n = room.getPlayerCount();
            List<Room.RoleInfo> roles = switch (n) {
                case 5 -> Arrays.asList(
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 6 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 7 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 8 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 9 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("影武者", "badpeople3.png")
                );
                case 10 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("工程師", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("影武者", "badpeople3.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                default -> throw new RuntimeException("尚未支援 " + n + " 人的遊戲模式");
            };

            Collections.shuffle(roles);
            List<String> names = room.getPlayers(); // 順序固定
            Map<String, Room.RoleInfo> assigned = new HashMap<>();
            for (int i = 0; i < names.size(); i++) {
                assigned.put(names.get(i), roles.get(i));
            }
            room.setAssignedRoles(assigned);

            // ✅ 只在首次 assign 時設定初始領袖
            room.setCurrentLeaderIndex(0);
            String picked = room.getPlayers().get(0);
            room.setLeader(picked);

            // ✅ 廣播初始領袖
            ws.convertAndSend("/topic/leader/" + roomId, picked);
        }

        roomRepo.save(room);
        return room;
    }



    /* ==================== 投票流程 ==================== */

    public void startVote(String roomId, List<String> expedition, String leader) {
        Room room = getRoomById(roomId);
        room.setCurrentExpedition(expedition);
        room.setVoteMap(new HashMap<>());

        // ✅ 修正這裡：使用參數 leader，而非不存在的 leaderName
        room.setLeader(leader);

        roomRepo.save(room);

        ws.convertAndSend("/topic/vote/" + roomId, Map.of(
                "agree", 0,
                "reject", 0,
                "finished", false,
                "expedition", expedition
        ));
    }

    public Map<String, Object> castVote(String roomId, String voter, Boolean agreeNullable, boolean abstain) {
        Room room = getRoomById(roomId);

        // 以 null 表示棄票
        Boolean valueToStore = abstain ? null : agreeNullable;
        room.getVoteMap().put(voter, valueToStore);
        roomRepo.save(room);

        // 正確計數：只算 true / false，不把 null 算進去
        long agreeCnt  = room.getVoteMap().values().stream()
                .filter(Boolean.TRUE::equals).count();
        long rejectCnt = room.getVoteMap().values().stream()
                .filter(Boolean.FALSE::equals).count();

        boolean finished = room.getVoteMap().size() == room.getPlayers().size();

        Map<String, Object> payload = Map.of(
                "agree", agreeCnt,
                "reject", rejectCnt,
                "finished", finished,
                "expedition", room.getCurrentExpedition()
        );

        ws.convertAndSend("/topic/vote/" + roomId, payload);

        if (finished) {
            String result = (agreeCnt > rejectCnt) ? "votePassed" : "voteFailed";
            ws.convertAndSend("/topic/vote/" + roomId, result);

            int nextIndex = (room.getCurrentLeaderIndex() + 1) % room.getPlayers().size();
            room.setCurrentLeaderIndex(nextIndex);
            String nextLeader = room.getPlayers().get(nextIndex);
            room.setLeader(nextLeader);
            ws.convertAndSend("/topic/leader/" + roomId, nextLeader);

            roomRepo.save(room);
        }

        return payload;
    }

    public Map<String, Object> getVoteState(String roomId, String requester) {
        Room room = getRoomById(roomId);

        long agreeCnt = room.getVoteMap().values().stream()
                .filter(Boolean.TRUE::equals).count();
        long rejectCnt = room.getVoteMap().values().stream()
                .filter(Boolean.FALSE::equals).count();
        // 若要顯示用，可順手算棄票數（非必要）
        // long abstainCnt = room.getVoteMap().values().stream()
        //         .filter(v -> v == null).count();

        boolean hasVoted = room.getVoteMap().containsKey(requester);
        boolean canVote = !hasVoted;

        return Map.of(
                "agree", agreeCnt,
                "reject", rejectCnt,
                "total", room.getPlayers().size(),
                "canVote", canVote,
                "hasVoted", hasVoted,
                "expedition", room.getCurrentExpedition()
        );
    }


    /* ==================== 任務卡提交處理 ==================== */
    public void submitMissionCard(String roomId, String player, String result) {
        Room room = getRoomById(roomId);

        // ✅ 只允許「本回合出戰名單」中的人提交
        List<String> expedition = room.getCurrentExpedition();
        if (expedition == null || !expedition.contains(player)) {
            throw new IllegalStateException("Player is not on expedition this round");
        }

        // ✅ 僅允許 SUCCESS 或 FAIL（大小寫固定）
        String normalized = Objects.requireNonNull(result, "result is required").toUpperCase(Locale.ROOT);
        if (!normalized.equals("SUCCESS") && !normalized.equals("FAIL")) {
            throw new IllegalArgumentException("result must be SUCCESS or FAIL");
        }

        room.getSubmittedMissionCards().put(player, normalized);
        roomRepo.save(room);

        // 結算：所有「出戰成員」都交了卡才進入計算
        if (room.getSubmittedMissionCards().size() == expedition.size()) {
            int success = 0, fail = 0;
            Map<String, String> submitted = room.getSubmittedMissionCards();

            for (String r : submitted.values()) {
                if ("SUCCESS".equals(r)) success++;
                else if ("FAIL".equals(r)) fail++;
            }

            int round = room.getCurrentRound();
            MissionRecord record = new MissionRecord(success, fail);
            record.setCardMap(new HashMap<>(submitted)); // 保留誰出什麼

            room.getMissionResults().put(round, record);
            room.getSubmittedMissionCards().clear();
            roomRepo.save(room);

            ws.convertAndSend("/topic/room/" + roomId, "allMissionCardsSubmitted");
        }
    }

    public List<String> generateSkillOrder(Room room) {
    // 技能觸發順序固定
        List<String> fixedOrder = Arrays.asList("影武者", "指揮官", "醫護兵", "潛伏者", "破壞者", "工程師");
        Set<String> assignedRoles = room.getAssignedRoles().values().stream()
                .map(roleInfo -> roleInfo.getName()) // 假設 RoleInfo 有 getName()
                .collect(Collectors.toSet());

        List<String> result = new ArrayList<>();
        for (String role : fixedOrder) {
            if (assignedRoles.contains(role)) {
                result.add(role);
            }
        }
        room.setSkillOrder(result);
        roomRepo.save(room);
        return result;
    }

    public boolean isSkillShadowed(Room room, String playerName) {
        // 若玩家沒有被影武者鎖定，或封鎖名單為空，就不封鎖
        if (room.getShadowDisabledMap() == null || room.getShadowDisabledMap().isEmpty()) {
            return false;
        }

        // 當前回合
        int currentRound = room.getCurrentRound();
        
        // 檢查該玩家是否在「某回合被封鎖的對象」裡
       return room.getShadowDisabledMap()
           .getOrDefault(currentRound, Collections.emptySet())
           .contains(playerName);
    }
    

}

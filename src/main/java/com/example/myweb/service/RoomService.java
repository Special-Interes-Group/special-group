package com.example.myweb.service;

import com.example.myweb.models.Room;
import com.example.myweb.models.MissionRecord;
import com.example.myweb.repositories.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.LocalDateTime;

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
                    new Room.RoleInfo("偵查官", "goodpeople1.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 6 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("偵查官", "goodpeople1.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png")
                );
                case 7 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("偵查官", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("影武者", "badpeople3.png")
                );
                case 8 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("偵查官", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("影武者", "badpeople3.png")
                );
                case 9 -> Arrays.asList(
                    new Room.RoleInfo("指揮官", "goodpeople3.png"),
                    new Room.RoleInfo("偵查官", "goodpeople1.png"),
                    new Room.RoleInfo("醫護兵", "goodpeople2.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("普通倖存者", "goodpeople4.png"),
                    new Room.RoleInfo("邪惡平民", "badpeople4.png"),
                    new Room.RoleInfo("潛伏者", "badpeople1.png"),
                    new Room.RoleInfo("破壞者", "badpeople2.png"),
                    new Room.RoleInfo("影武者", "badpeople3.png")
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

    // 替換舊的 startVote(...)：移除 leader 參數 & 不再 setLeader
    public void startVote(String roomId, List<String> expedition) {
        Room room = getRoomById(roomId);

        room.setCurrentExpedition(
            expedition != null ? new ArrayList<>(expedition) : new ArrayList<>()
        );
        room.setVoteMap(new HashMap<>()); // 清票
        // ❌ 不要動 leader，輪替發生在結算時

        roomRepo.save(room);

        // 廣播「開始投票」，讓所有人一併跳頁
        ws.convertAndSend("/topic/room/" + roomId, "startVote");

        // （保留）投票中的即時統計初始化
        ws.convertAndSend("/topic/vote/" + roomId, Map.of(
            "agree", 0,
            "reject", 0,
            "finished", false,
            "expedition", room.getCurrentExpedition()
        ));
    }

    // 新增：統一結算 + 廣播 + 輪替 + save（冪等：只要滿員就可呼叫）
    private void closeVoteAndRotate(Room room, String roomId) {
        Map<String, Boolean> voteMap = room.getVoteMap();
        if (voteMap == null) voteMap = new HashMap<>();

        int total = room.getPlayers().size();
        int agree = 0, reject = 0;
        for (Boolean v : voteMap.values()) {
            if (v == null) continue;        // null = 棄票
            if (v) agree++; else reject++;
        }
        int abstain = Math.max(0, total - (agree + reject));
        int effective = Math.max(0, total - abstain);
        int threshold = (int) Math.ceil(effective / 2.0);

        boolean passed = agree >= threshold;

        // 廣播最終結果
        ws.convertAndSend("/topic/vote/" + roomId, passed ? "votePassed" : "voteFailed");

        // ✅ 在「回合結束」時輪替
        int nextIndex = (room.getCurrentLeaderIndex() + 1) % total;
        room.setCurrentLeaderIndex(nextIndex);
        String nextLeader = room.getPlayers().get(nextIndex);
        room.setLeader(nextLeader);

        roomRepo.save(room);

        // （可選）讓房間頁即時刷新領袖
        ws.convertAndSend("/topic/leader/" + roomId, nextLeader);
        ws.convertAndSend("/topic/room/" + roomId, "leaderChanged");
    }

    public Map<String, Object> castVote(String roomId, String voter, Boolean agreeNullable, boolean abstain) {
        Room room = getRoomById(roomId);

        // 存一票（null 代表棄票）
        room.getVoteMap().put(voter, abstain ? null : agreeNullable);
        roomRepo.save(room);

        long agreeCnt  = room.getVoteMap().values().stream().filter(Boolean.TRUE::equals).count();
        long rejectCnt = room.getVoteMap().values().stream().filter(Boolean.FALSE::equals).count();

        boolean finished = room.getVoteMap().size() == room.getPlayers().size();

        Map<String, Object> payload = Map.of(
                "agree", agreeCnt,
                "reject", rejectCnt,
                "finished", finished,
                "expedition", room.getCurrentExpedition()
        );
        ws.convertAndSend("/topic/vote/" + roomId, payload);

        // ✅ 全員皆有紀錄（含棄票）→ 立刻結算與輪替
        if (finished) {
            closeVoteAndRotate(room, roomId);
        }
        return payload;
    }

    public void timeUpFinalize(String roomId) {
        Room room = getRoomById(roomId);
        Map<String, Boolean> voteMap = room.getVoteMap();
        if (voteMap == null) {
            voteMap = new HashMap<>();
            room.setVoteMap(voteMap);
        }
        // 將所有未投者補為棄票（null）
        for (String p : room.getPlayers()) {
            voteMap.putIfAbsent(p, null);
        }
        roomRepo.save(room);

        // 收尾（與 castVote 完成時一致）
        closeVoteAndRotate(room, roomId);
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
        List<String> fixedOrder = Arrays.asList("影武者", "指揮官", "醫護兵", "潛伏者", "破壞者", "偵查官");
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

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // ✅ 每分鐘檢查一次，刪除結束超過3分鐘的房間
    @Scheduled(fixedRate = 60000)
    public void cleanUpRooms() {
        var rooms = roomRepository.findAll();
        for (Room r : rooms) {
            if (r.getEndTime() != null &&
                r.getEndTime().plusMinutes(3).isBefore(LocalDateTime.now())) {
                roomRepository.deleteById(r.getId());
                System.out.println("自動刪除房間: " + r.getId());
            }
        }
    }
    /**
 * ✅ 根據房間與遊戲結果，生成每位玩家的角色與勝敗資訊
 */
    public Map<String, Map<String, Object>> generatePlayerResults(Room room, String result) {
        Map<String, Map<String, Object>> playerResults = new HashMap<>();

        if (room == null || room.getPlayers() == null || room.getPlayers().isEmpty()) {
            return playerResults;
        }

        // ✅ 定義好人陣營角色
        Set<String> goodRoles = Set.of("普通倖存者", "偵查官", "指揮官", "醫護兵");

        // ✅ 判斷本場是好人贏還是壞人贏
        boolean goodWin = result.contains("正方") || result.contains("好人");

        // ✅ 取得已分配角色
        Map<String, Room.RoleInfo> assignedRoles = room.getAssignedRoles();

        for (String player : room.getPlayers()) {
            Room.RoleInfo info = assignedRoles != null ? assignedRoles.get(player) : null;
            String roleName = info != null ? info.getName() : "未知角色";
            String avatar = info != null ? info.getAvatar() : "default.png";

            boolean isGood = goodRoles.contains(roleName);
            String outcome = ((isGood && goodWin) || (!isGood && !goodWin)) ? "勝利" : "落敗";

            Map<String, Object> detail = new HashMap<>();
            detail.put("role", roleName);
            detail.put("avatar", "/images/" + avatar);
            detail.put("outcome", outcome);

            playerResults.put(player, detail);
        }

        return playerResults;
    }

    

}

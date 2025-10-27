/**
 * MywebApplication.java
 *
 * ▶ 此檔案是整個 Spring Boot 專案的啟動入口點（Main Method）。
 *
 * ▶ 功能說明：
 *   - 使用 `@SpringBootApplication` 註解標記，代表：
 *     - 自動設定（@EnableAutoConfiguration）
 *     - 元件掃描（@ComponentScan）
 *     - Spring 設定（@Configuration）
 *   - `SpringApplication.run(...)` 負責啟動 Spring Boot 應用，載入所有元件與設定
 *
 * ▶ 專案啟動流程：
 *   1. 載入 application.properties / application.yml（若有）
 *   2. 自動建立 MongoDB 連線（根據 spring.data.mongodb.uri）
 *   3. 掃描 controllers、models、repositories、service 等所有 Spring 元件
 *   4. 建立 WebSocket、REST API、模板引擎等必要設定
 *
 * ▶ 備註：
 *   - `src/main/java/com/example/myweb` 為根目錄，因此所有元件需放此結構下才能被掃描
 *   - 專案打包後，可使用 `java -jar xxx.jar` 執行
 */

package com.example.myweb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import jakarta.annotation.PostConstruct;   // ✅ 新增 import
import java.util.TimeZone;               // ✅ 新增 import

@SpringBootApplication
@EnableScheduling
public class MywebApplication {

    public static void main(String[] args) {
        // ➤ 印出環境變數確認是否有讀到 Render 設定的值
        System.out.println("🌍 MONGODB_URI = " + System.getenv("MONGODB_URI"));

        SpringApplication.run(MywebApplication.class, args);
    }

    /** ✅ 啟動時設定全域時區為台灣時間 */
    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Taipei"));
        System.out.println("🕒 系統時區已設定為 Asia/Taipei (台灣)");
    }
}

package com.example.myweb.config;

import org.springframework.lang.NonNull;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(@NonNull ViewControllerRegistry r) {
        // 根路徑導到外殼頁（static 下的檔案）
        r.addRedirectViewController("/", "/bgm-shell.html");

        // 將 URL 對應到 templates 下的檔名（去掉 .html 的 view name）
        r.addViewController("/index").setViewName("index");   // templates/index.html
        r.addViewController("/game").setViewName("game");     // templates/game.html
        r.addViewController("/about").setViewName("about");   // templates/about.html
        r.addViewController("/team").setViewName("team");     // templates/team.html
        // 有其他頁就照這個模式加
    }
}

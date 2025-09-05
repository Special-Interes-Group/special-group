# ===== Build stage：用官方 Maven 打包，不需要 mvnw/.mvn =====
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 先拷 POM 以便快取相依（之後只要 pom 沒變，這層會被快取）
COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline

# 再拷原始碼
COPY src ./src

# 打包（跳測試）
RUN mvn -B -DskipTests package

# ===== Runtime stage：用精簡 JRE 執行 =====
FROM eclipse-temurin:21-jre
WORKDIR /app

# 複製可執行 jar
COPY --from=build /app/target/*.jar app.jar

# 若本機 8080 常被佔用，可以之後用 compose 對外映射不同 port
EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]

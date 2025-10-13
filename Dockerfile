#使用官方 Maven 映像（maven:3.9-eclipse-temurin-21）進行編譯與打包。
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

#單獨複製 POM 檔先行安裝相依性。
COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline

# 再拷原始碼
COPY src ./src

# 打包（跳測試）
RUN mvn -B -DskipTests package

# Runtime stage：用精簡 JRE 執行 
FROM eclipse-temurin:21-jre
WORKDIR /app

# 複製可執行 jar
COPY --from=build /app/target/*.jar app.jar

#宣告容器內部服務埠
EXPOSE 8080
#指定容器啟動命令
ENTRYPOINT ["java","-jar","/app/app.jar"]

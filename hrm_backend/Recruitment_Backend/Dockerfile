# ---------- Stage 1: build ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null 2>&1 || true   # cache deps
COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon
 
# ---------- Stage 2: run ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd -r -u 1001 spring
COPY --from=build /app/build/libs/*.jar app.jar
USER spring
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 5008
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

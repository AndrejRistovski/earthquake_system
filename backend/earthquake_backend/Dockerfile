# syntax=docker/dockerfile:1.7

# --- Build stage -----------------------------------------------------------
FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /workspace

# Maven wrapper + POM first → dependency layer is cached when only sources change.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw \
    && ./mvnw -B -ntp -q dependency:go-offline

# Sources after deps → editing src/ doesn't bust the dependency cache.
COPY src ./src
RUN ./mvnw -B -ntp -DskipTests package \
    && cp target/*.jar app.jar

# --- Runtime stage ---------------------------------------------------------
FROM eclipse-temurin:21-jre-noble AS runtime

# Non-root user
RUN groupadd --system --gid 1001 spring \
    && useradd  --system --uid 1001 --gid spring --shell /usr/sbin/nologin --create-home spring

WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
RUN chown spring:spring app.jar

USER spring:spring
EXPOSE 9090

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]

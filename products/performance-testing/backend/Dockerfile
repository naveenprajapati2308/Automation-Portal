FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

# k6 is invoked server-side via ProcessBuilder (no browser CORS limits, no extra
# service) — install the binary straight into the runtime image.
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates \
    && curl -L https://github.com/grafana/k6/releases/download/v0.52.0/k6-v0.52.0-linux-amd64.tar.gz \
       | tar -xz -C /usr/local/bin --strip-components=1 \
    && k6 version \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/k6-runs

COPY --from=build /workspace/target/*.jar /app/performance-testing-backend.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/performance-testing-backend.jar"]

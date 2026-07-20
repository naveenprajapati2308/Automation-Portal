FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q package

FROM maven:3.9.9-eclipse-temurin-21
WORKDIR /app

# Install Chrome for Selenium headless tests
RUN apt-get update && apt-get install -y \
    wget \
    gnupg2 \
    apt-transport-https \
    ca-certificates \
    curl \
    unzip \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /workspace/target/*.jar /app/framework-runner.jar
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Chrome's sandbox refuses to run as root ("Running as root without --no-sandbox is not
# supported") — rather than add --no-sandbox to MPHIDB's test code, run this whole container
# as a regular user instead, which Chrome's sandbox is fine with.
RUN useradd --create-home --shell /bin/bash chromeuser \
    && mkdir -p /app/framework \
    && chown -R chromeuser:chromeuser /app
USER chromeuser

EXPOSE 9090
ENV FRAMEWORK_PATH=/app/framework
ENV MAVEN_CMD=mvn
ENV HOME=/home/chromeuser

ENTRYPOINT ["/app/entrypoint.sh"]

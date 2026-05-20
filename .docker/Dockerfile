FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    ca-certificates \
    squashfs-tools-ng \
    qemu-user-static \
    build-essential \
    clang \
    libclang-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI (to talk to docker:dind service)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /usr/share/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu noble stable" \
      > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# start-cli from Start9Labs/start-os
RUN ARCH=$(uname -m) \
    && DL=$(curl -fsSL "https://api.github.com/repos/Start9Labs/start-os/releases" \
        | jq -r "[.[].assets[] | select(.name==\"start-cli_${ARCH}-linux\")] | first | .browser_download_url") \
    && curl -fsSL "$DL" -o /usr/local/bin/start-cli \
    && chmod +x /usr/local/bin/start-cli \
    && start-cli --version

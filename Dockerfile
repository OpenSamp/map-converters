FROM node:20-alpine

WORKDIR /app

# Install everything from package.json including dev deps (tsx + jsdom power the CLI).
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --silent --no-audit --no-fund

# Source for the CLI runtime (tsx loads .ts on the fly — no build step needed).
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./

ENTRYPOINT ["node", "--import", "tsx", "scripts/cli.ts"]
CMD ["--help"]

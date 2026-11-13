# Сборка из корня репозитория: docker build -f server/Dockerfile .
# Серверу нужны алгоритм подбора (src/match), типы мест и каталог data/places.json.
FROM node:24-slim
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/src server/src
COPY src/match/matchGroup.ts src/match/hours.ts src/match/
COPY src/data/place.ts src/data/
COPY src/engine/geo.ts src/engine/
COPY data/places.json data/
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production DATA_DIR=/data PORT=8787
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/src/index.ts"]

# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev

# ---- Production stage ----
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Roda como o usuário `node` (uid 1000) da imagem base, nunca root.
# Par com o runAsNonRoot/runAsUser dos manifestos K8s.
USER node

EXPOSE 3000

CMD ["node", "dist/main"]

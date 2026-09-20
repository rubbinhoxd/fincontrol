FROM node:20-alpine AS build
# Baileys puxa algumas deps via git e requer toolchain para libs nativas
RUN apk add --no-cache git python3 make g++
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache git python3 make g++
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
# Diretorio das sessoes do Baileys (montado como volume, uma subpasta por user)
RUN mkdir -p /app/auth_info
# API HTTP interna
EXPOSE 3000
CMD ["node", "dist/index.js"]

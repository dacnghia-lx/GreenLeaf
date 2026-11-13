# ---- Build: biên dịch TypeScript -> dist ----
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- Chạy: chỉ cài dependencies production + bản dist ----
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 4000
# Tạo/cập nhật bảng, seed lần đầu khi DB trống, rồi chạy API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/prisma/seed-if-empty.js && node dist/src/index.js"]

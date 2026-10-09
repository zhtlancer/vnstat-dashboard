# =====================
# STAGE 1: Build React frontend
# =====================
FROM alpine:3.21.3 AS frontend-build

RUN apk add --no-cache nodejs npm python3 build-base git

WORKDIR /app/frontend

# Better caching: copy lockfile/package.json first
COPY frontend/package*.json ./
# Use npm ci for reproducible, faster, clean installs
RUN npm ci

COPY frontend/ ./
RUN npm run build

# =====================
# STAGE 2: Set up Node backend with built frontend
# =====================
FROM alpine:3.21.3 AS backend-build

RUN apk add --no-cache nodejs npm

WORKDIR /app/backend

# Better caching for backend too
COPY backend/package*.json ./
RUN npm ci --omit=dev

# =====================
# STAGE 3: Runtime (no npm, non-root)
# =====================
FROM alpine:3.21.3

# Runtime deps only
RUN apk add --no-cache nodejs vnstat \
    && addgroup -S app && adduser -S -G app -H -h /app app

WORKDIR /app/backend

# Copy the backend with its production deps and the built frontend
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build /app/frontend-build

USER app

ENV FRONTEND_DIR=frontend-build
ENV PORT=8050

EXPOSE 8050

CMD ["node", "server.js"]

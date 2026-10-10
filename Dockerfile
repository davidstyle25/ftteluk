# Stage 1: Build the Node.js server (TanStack Start / Nitro)
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and config
COPY . .

# Variabel VITE_* ditanam ke bundle browser SAAT BUILD, jadi harus tersedia di sini.
# Di Coolify: isi sebagai "Build Variable" (centang Build Variable). Hanya kunci PUBLIK (anon) —
# JANGAN pernah memasukkan service role key ke sini.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID=default
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Build the standalone Node server into build-node/
RUN npm run build:node

# Stage 2: Runtime image - nitro node-server output is self-contained
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built server output and the entry point
COPY --from=builder /app/build-node ./build-node
COPY app.js ./

EXPOSE 3000

CMD ["node", "app.js"]

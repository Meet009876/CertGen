# ---- Dev Mode Dockerfile for Next.js Frontend ----
FROM node:20-alpine

WORKDIR /app

# Copy package files first (layer caching - only reinstalls when deps change)
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for `next dev`)
RUN npm install

# Copy the rest of the source (will be overridden by volume mount in dev)
COPY . .

# Expose Next.js dev server port
EXPOSE 3000

# Run Next.js in dev mode with hot reload
CMD ["npm", "run", "dev"]

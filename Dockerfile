# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy rest of the code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose your app port (change if needed)
EXPOSE 3000

# Start app
CMD ["pnpm", "start"]
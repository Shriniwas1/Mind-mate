FROM node:20-bullseye-slim

# Install system dependencies required for native modules and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install packages
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Remove the local model folder to prevent inflating the docker image size
RUN rm -rf model

# Set default port to 7860 as expected by Hugging Face Spaces
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "server.js"]

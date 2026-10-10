# Use Node.js official lightweight image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy application source code
COPY . .

# Expose container port
EXPOSE 3000

# Set production environment
ENV PORT=3000

# Start server
CMD ["node", "server-local.js"]

FROM node:18-alpine

WORKDIR /app

# Instalar git para submodules
RUN apk add --no-cache git

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY . .

# Build del proyecto (siguiendo el script de Nodit)
RUN npm run build

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Cambiar ownership
RUN chown -R mcp:nodejs /app
USER mcp

# Health check endpoint
EXPOSE 3000

# Comando principal
CMD ["node", "build/index.js"]

FROM node:18-alpine

WORKDIR /app

# Instalar git para submodules
RUN apk add --no-cache git

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src/ ./src/
# Copiar spec si existe (para las APIs de Nodit)
COPY spec/ ./spec/ 2>/dev/null || true

# Instalar dependencias de desarrollo para el build
RUN npm install typescript @types/node --save-dev

# Build del proyecto
RUN npm run build

# Limpiar dependencias de desarrollo
RUN npm prune --production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Cambiar ownership
RUN chown -R mcp:nodejs /app
USER mcp

# Exponer puerto para health check
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({hostname: 'localhost', port: 3000, path: '/health', timeout: 2000}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Comando principal
CMD ["node", "build/index.js"]

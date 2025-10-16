# Use a imagem oficial do Node.js 18 (LTS)
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    postgresql-client \
    tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone

# Copiar arquivos de configuração
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY src ./src/

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S marybot -u 1001 -G nodejs

# Mudar ownership dos arquivos
RUN chown -R marybot:nodejs /app
USER marybot

# Expor porta (se necessário para health checks)
EXPOSE 3000

# Comando de health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot está rodando')" || exit 1

# Comando padrão
CMD ["node", "src/index.js"]
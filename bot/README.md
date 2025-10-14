# 🤖 MaryBot Discord Service

Serviço Discord do MaryBot que se conecta ao Backend Service via WebSocket para comunicação em tempo real e orquestração de eventos.

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Discord
DISCORD_TOKEN=your-bot-token-here
CLIENT_ID=your-application-client-id
GUILD_ID=optional-dev-guild-id

# Backend Service
BACKEND_SERVICE_URL=http://localhost:3002
SERVICE_TOKEN=bot-service-token
USE_WEBSOCKET=true
ENABLE_FALLBACK=true

# Fallback API
API_SERVICE_URL=http://localhost:3001
DATABASE_URL="postgresql://botuser:botpass@homelab.op:5400/marybot"
```

### Instalação

```bash
npm install
```

### Deployment de Comandos

```bash
npm run deploy
```

### Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🏗️ Arquitetura

### WebSocket First

O bot prioriza comunicação via WebSocket com o Backend Service:

- ✅ **Modo Principal**: WebSocket para tempo real
- 🔄 **Modo Fallback**: Acesso direto ao banco (se habilitado)
- 📊 **Monitoramento**: Reconexão automática

### Serviços

#### WebSocketClient (`src/services/websocketClient.js`)
- Conexão e autenticação com Backend Service
- Handlers para eventos em tempo real
- Fallback automático em caso de falha

#### DataService (`src/services/dataService.js`)
- Abstração de operações de dados
- Execução com fallback automático
- Métodos para usuários, economia, personagens, quiz

### Comandos Refatorados

Todos os comandos foram atualizados para usar o `DataService`:

- `/daily` - Recompensas diárias via WebSocket
- `/profile` - Perfis de usuário
- `/leaderboard` - Rankings da comunidade
- `/quote` - Citações de anime

### Eventos em Tempo Real

O bot recebe e processa eventos do Backend:

- 🎉 **Level Up**: Notificações automáticas
- 🏆 **Achievements**: Conquistas desbloqueadas
- 📢 **Announcements**: Eventos e promoções
- 🎯 **Quiz Events**: Progresso de quizzes

## 🔄 Fallback System

### Modo Degradado

Quando o WebSocket não está disponível:

1. **Detecção Automática**: Falha na conexão WebSocket
2. **Fallback Database**: Acesso direto ao Prisma (se habilitado)
3. **Funcionalidade Limitada**: Comandos básicos continuam funcionando
4. **Reconexão**: Tentativas automáticas de reconexão

### Configuração do Fallback

```env
ENABLE_FALLBACK=true  # Habilita modo fallback
USE_WEBSOCKET=false   # Força uso de database direto
```

## 📊 Monitoramento

### Logs do Sistema

```bash
🔌 Connected to Backend Service
✅ WebSocket connected
🔑 Successfully authenticated
⚠️ WebSocket disconnected: transport close
🔄 Fallback mode: getUserProfile
```

### Health Check

O bot expõe informações de saúde via comandos internos:

- Status da conexão WebSocket
- Modo de operação (WebSocket/Fallback)
- Estatísticas de comandos
- Informações de reconexão

## 🚀 Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marybot-discord
spec:
  replicas: 1
  selector:
    matchLabels:
      app: marybot-discord
  template:
    metadata:
      labels:
        app: marybot-discord
    spec:
      containers:
      - name: bot
        image: marybot-discord:latest
        env:
        - name: BACKEND_SERVICE_URL
          value: "http://marybot-backend:3002"
        - name: USE_WEBSOCKET
          value: "true"
```

## 🔐 Segurança

### Autenticação de Serviço

O bot se autentica no Backend Service usando:

```javascript
socket.emit('authenticate', {
  service: 'discord-bot',
  token: process.env.SERVICE_TOKEN,
  version: '1.0.0'
});
```

### Tokens e Secrets

- `DISCORD_TOKEN`: Token do bot Discord
- `SERVICE_TOKEN`: Token para autenticação no Backend
- `DATABASE_URL`: URL de conexão (apenas fallback)

## 🐛 Troubleshooting

### Problemas Comuns

**WebSocket não conecta:**
```bash
❌ Failed to connect to Backend Service: connect ECONNREFUSED
```
- Verifique se Backend Service está executando
- Confirme `BACKEND_SERVICE_URL` no .env
- Teste conectividade de rede

**Fallback não funciona:**
```bash
⚠️ Operation failed: getUser - Backend not available
```
- Verifique `ENABLE_FALLBACK=true`
- Confirme acesso ao banco de dados
- Teste `DATABASE_URL`

**Bot não responde:**
```bash
🔄 Fallback mode: getOrCreateUser - Backend not available
```
- Modo degradado ativo
- Funcionalidade limitada
- Aguardar reconexão do WebSocket

### Debug Mode

```env
NODE_ENV=development
```

Ativa logs detalhados para debugging.

## 📈 Performance

### Métricas

- **Latência WebSocket**: ~10-50ms
- **Fallback Database**: ~100-500ms
- **Memory Usage**: ~150-300MB
- **CPU Usage**: ~5-15% (spikes durante eventos)

### Otimizações

1. **Connection Pooling**: Prisma gerencia pool de conexões
2. **Event Batching**: Eventos agrupados quando possível
3. **Cache Local**: Dados frequentes em cache (se habilitado)
4. **Lazy Loading**: Recursos carregados sob demanda

---

**Próximo**: [Admin Panel](../admin-panel/README.md) | **Anterior**: [Backend Service](../backend/README.md)
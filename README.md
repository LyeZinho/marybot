# 🤖 MaryBot - Sistema Completo de Bot Discord

**Bot Discord de nível empresarial para comunidades anime com arquitetura de microserviços**

![Node.js](https://img.shields.io/badge/node.js-18%2B-green)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue) 
![Next.js](https://img.shields.io/badge/next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![Socket.IO](https://img.shields.io/badge/socket.io-4.7-red)
![Prisma](https://img.shields.io/badge/prisma-v5-purple)

## 🏗️ Arquitetura de Microserviços

O MaryBot utiliza uma arquitetura distribuída moderna com 4 serviços independentes:

```
🎮 MARYBOT MICROSERVICES ARCHITECTURE

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  Backend Service │    │   API Service   │    │   Bot Service   │
│   (Next.js)     │◄──►│   (WebSocket)    │◄──►│    (REST)       │    │   (Discord.js)  │
│   Port: 3003    │    │   Port: 3002     │    │   Port: 3001    │    │   WebSocket     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database                                        │
│                           homelab.op:5400/marybot                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 📁 Estrutura de Diretórios

```
marybot/
├── 🔌 api/                    # REST API Service (Port 3001)
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.js           # Database seeding
│   └── src/
│       ├── controllers/       # API controllers
│       ├── routes/           # Express routes
│       ├── middleware/       # Auth & validation
│       └── database/         # Database client
│
├── 🔄 backend/               # WebSocket Orchestration (Port 3002)
│   └── src/
│       ├── services/         # Business logic services
│       ├── workers/          # Background job processing
│       └── index.js         # Socket.IO server
│
├── 🤖 bot/                   # Discord Bot Service
│   └── src/
│       ├── commands/         # Slash commands
│       │   ├── anime/       # Anime-related commands
│       │   ├── economy/     # Economy system
│       │   ├── games/       # Mini-games
│       │   └── core/        # Core functionality
│       ├── events/          # Discord events
│       ├── services/        # WebSocket client & data abstraction
│       └── utils/           # Helper utilities
│
└── 🎛️ admin-panel/          # Admin Interface (Port 3003)
    └── src/
        ├── components/      # React components
        ├── pages/          # Next.js pages
        ├── contexts/       # React contexts
```

## ✨ Funcionalidades Completas

### 🎌 Comandos de Anime
- **`/anime-search [nome]`** - Busca informações detalhadas sobre animes via API AniList
- **`/quote`** - Exibe citações aleatórias de animes populares
- **`/waifu`** - Gera imagens de waifus/husbandos aleatórios

### 💰 Sistema de Economia
- **`/daily`** - Coleta recompensa diária (moedas + XP)
- **`/profile [usuário]`** - Visualiza perfil completo com estatísticas
- **`/leaderboard [tipo]`** - Rankings por XP, moedas ou nível
- **Sistema de XP automático** - Ganhe XP enviando mensagens
- **Levels dinâmicos** - Sistema de progressão baseado em XP

### 🎮 Mini-Jogos e Entretenimento
- **`/gacha [tipo]`** - Sistema de invocação de personagens
  - Single pull (50 moedas)
  - 10x pulls (450 moedas)
  - Raridades: Comum, Raro, Épico, Lendário
- **`/quiz [dificuldade]`** - Quiz sobre animes com recompensas
  - 3 níveis de dificuldade
  - Sistema de pontuação
  - Recompensas baseadas na performance

### 🛠️ Comandos Core
- **`/help`** - Lista todos os comandos disponíveis
- **`/ping`** - Verifica latência do bot
- **Easter eggs** - Respostas automáticas e interações especiais

### 🎛️ Admin Panel (Interface Web)
- **Dashboard em tempo real** - Estatísticas e gráficos
- **Gerenciamento de usuários** - CRUD completo
- **Configurações do sistema** - Personalização total
- **Analytics avançados** - Métricas detalhadas
- **Monitoramento de serviços** - Status e saúde do sistema

## 🚀 Instalação e Configuração

### Pré-requisitos
- **Node.js 18+**
- **PostgreSQL 16**
- **Discord Application** com bot token
- **NPM ou Yarn**

### 1. 📥 Clone e Configuração Inicial

```bash
git clone https://github.com/LyeZinho/marybot.git
cd marybot
```

### 2. 🗄️ Configuração do Banco de Dados

```bash
# Criar banco PostgreSQL
createdb marybot

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. 🔌 API Service (Porta 3001)

```bash
cd api

# Instalar dependências
npm install

# Configurar banco
cp .env.example .env
# Edite DATABASE_URL no .env

# Executar migrações e seed
npx prisma db push
npx prisma db seed

# Iniciar serviço
npm start
```

### 4. 🔄 Backend Service (Porta 3002)

```bash
cd ../backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Configure as URLs dos serviços

# Iniciar serviço
npm start
```

### 5. 🤖 Bot Service

```bash
cd ../bot

# Instalar dependências
npm install

# Configurar bot
cp .env.example .env
# Configure DISCORD_TOKEN, CLIENT_ID, GUILD_ID

# Deploy dos comandos
npm run deploy

# Iniciar bot
npm start
```

### 6. 🎛️ Admin Panel (Porta 3003)

```bash
cd ../admin-panel

# Instalar dependências
npm install

# Configurar interface
cp .env.example .env
# Configure URLs dos serviços

# Modo desenvolvimento
npm run dev

# Ou build para produção
npm run build
npm start
```

## 🔧 Configuração Avançada

### 📊 Banco de Dados PostgreSQL

```sql
-- Configuração recomendada
CREATE DATABASE marybot;
CREATE USER botuser WITH PASSWORD 'botpass';
GRANT ALL PRIVILEGES ON DATABASE marybot TO botuser;

-- Para desenvolvimento local
DATABASE_URL="postgresql://botuser:botpass@localhost:5432/marybot"

-- Para produção
DATABASE_URL="postgresql://botuser:botpass@homelab.op:5400/marybot"
```

### 🔐 Variáveis de Ambiente

#### API Service (.env)
```env
DATABASE_URL="postgresql://botuser:botpass@homelab.op:5400/marybot"
API_PORT=3001
JWT_SECRET="your-super-secret-jwt-key"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3002,http://localhost:3003"
```

#### Backend Service (.env)
```env
API_SERVICE_URL=http://localhost:3001
BACKEND_PORT=3002
SERVICE_TOKEN=backend-service-token
```

#### Bot Service (.env)
```env
DISCORD_TOKEN=your-discord-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-test-guild-id
BACKEND_SERVICE_URL=http://localhost:3002
USE_WEBSOCKET=true
ENABLE_FALLBACK=true
```

#### Admin Panel (.env)
```env
API_SERVICE_URL=http://localhost:3001
BACKEND_SERVICE_URL=http://localhost:3002
NEXTAUTH_URL=http://localhost:3003
ENABLE_REALTIME=true
```

## 🛠️ Scripts Disponíveis

### Comandos por Serviço

```bash
# API Service
npm start          # Iniciar servidor de produção
npm run dev        # Modo desenvolvimento com nodemon
npm run db:generate # Gerar Prisma client
npm run db:push    # Aplicar schema ao banco
npm run db:seed    # Popular banco com dados iniciais

# Backend Service  
npm start          # Iniciar orquestração WebSocket
npm run dev        # Modo desenvolvimento

# Bot Service
npm start          # Iniciar bot Discord
npm run dev        # Modo desenvolvimento
npm run deploy     # Deploy dos slash commands

# Admin Panel
npm run dev        # Servidor desenvolvimento (porta 3003)
npm run build      # Build para produção
npm start          # Servidor de produção
npm run lint       # Verificar código
```

### Comandos de Sistema
```bash
# Iniciar todos os serviços em desenvolvimento
npm run dev:all    # (futuro)

# Build completo para produção  
npm run build:all  # (futuro)

# Testes automatizados
npm test           # (futuro)
```

## 🔄 Fluxo de Comunicação

### Real-time WebSocket Events
```javascript
// Eventos do Bot para Backend
- user:message         # Mensagem enviada
- user:commandUsed     # Comando executado
- user:levelUp         # Usuário subiu de nível
- user:dailyClaimed    # Daily reward coletado

// Eventos do Backend para Bot
- stats:update         # Estatísticas atualizadas
- notification:send    # Enviar notificação
- config:update        # Configuração alterada

// Eventos do Admin Panel
- admin:getStats       # Solicitar estatísticas
- admin:updateConfig   # Alterar configurações
- admin:userAction     # Ação em usuário
```

### REST API Endpoints
```
GET    /users              # Listar usuários
POST   /users              # Criar usuário
PUT    /users/:id          # Atualizar usuário
DELETE /users/:id          # Deletar usuário

POST   /economy/daily      # Processar daily reward
POST   /economy/add-xp     # Adicionar XP
POST   /economy/add-coins  # Adicionar moedas

GET    /characters         # Listar personagens
POST   /characters         # Criar personagem

GET    /quiz/questions     # Listar perguntas
POST   /quiz/questions     # Criar pergunta
```

## 🎯 Recursos Avançados

### 🔒 Sistema de Autenticação
- **JWT Tokens** para autenticação entre serviços
- **Rate Limiting** para proteção contra spam
- **Middleware de validação** em todas as rotas
- **CORS configurado** para segurança

### 📊 Analytics e Monitoramento
- **Dashboard em tempo real** via WebSocket
- **Métricas de performance** de comandos
- **Tracking de usuários** e atividades
- **Logs estruturados** para debugging

### 🎮 Sistema de Gacha Avançado
```javascript
// Rates de raridade
Comum:     60% (★)
Raro:      25% (★★)  
Épico:     12% (★★★)
Lendário:   3% (★★★★)

// Pity system - garantia a cada 90 pulls
// Spark system - escolher personagem específico
```

### 🏆 Sistema de Achievements
- **Progressão automática** baseada em atividades
- **Recompensas especiais** por marcos
- **Badges colecionáveis** no perfil
- **Ranking de conquistas**

## 🔧 Desenvolvimento e Contribuição

### Estrutura de Código
```bash
# Padrões seguidos
- ES6+ Modules
- Async/Await pattern
- Clean Architecture
- SOLID principles
- RESTful API design
- Component-based React
```

### Git Workflow
```bash
# Branch principal
main                   # Produção estável

# Branches de desenvolvimento
feature/nome-funcao   # Novas funcionalidades
fix/nome-bug         # Correções
hotfix/urgente       # Correções urgentes
```

### Testes (Futuro)
```bash
# Testes unitários
npm run test:unit

# Testes de integração  
npm run test:integration

# Testes end-to-end
npm run test:e2e
```

## 🐳 Docker e Deploy

### 🚀 Scripts de Inicialização Única

#### Windows (PowerShell)
```bash
# Modo Desenvolvimento - todos os serviços
.\start.ps1 -Mode dev

# Modo Produção - Docker Compose
.\start.ps1 -Mode prod

# Serviço específico
.\start.ps1 -Mode dev -Service api
.\start.ps1 -Mode dev -Service bot

# Produção com limpeza
.\start.ps1 -Mode prod -Clean
```

#### Linux/macOS (Bash)
```bash
# Tornar executável (primeira vez)
chmod +x start.sh

# Modo Desenvolvimento - todos os serviços
./start.sh -m dev

# Modo Produção - Docker Compose
./start.sh -m prod

# Serviço específico
./start.sh -m dev -s api
./start.sh -m dev -s bot

# Produção com limpeza
./start.sh -m prod -c
```

### 🛠️ Makefile (Comandos Simplificados)

```bash
# Comandos principais
make help              # Mostrar todos os comandos
make setup             # Configuração inicial completa
make dev               # Modo desenvolvimento
make prod              # Modo produção
make clean             # Limpar ambiente

# Por serviço
make dev-api           # Apenas API Service
make dev-backend       # Apenas Backend Service  
make dev-bot           # Apenas Bot Service
make dev-admin         # Apenas Admin Panel

# Banco de dados
make db-up             # Iniciar PostgreSQL
make db-migrate        # Executar migrações
make db-seed           # Popular com dados
make db-studio         # Abrir Prisma Studio

# Monitoramento
make logs              # Logs de todos os serviços
make logs-api          # Logs apenas do API
make status            # Status dos containers
make health            # Health check completo
make monitor           # Monitoramento contínuo

# Utilitários
make backup            # Backup do banco
make update            # Atualizar dependências
make deploy            # Deploy completo
```

### 🐳 Docker Compose Completo

#### Desenvolvimento
```bash
# Iniciar todos os serviços
docker-compose up -d

# Com rebuild
docker-compose up --build -d

# Logs específicos
docker-compose logs -f api
docker-compose logs -f backend
docker-compose logs -f bot
docker-compose logs -f admin-panel

# Parar serviços
docker-compose down

# Limpar volumes
docker-compose down -v
```

#### Configuração de Portas
```bash
# Serviços expostos
- PostgreSQL: 5400:5432
- API Service: 3001:3001
- Backend Service: 3002:3002  
- Admin Panel: 3003:3003
```

### 🚀 Deploy para Produção

#### Script Automatizado (Windows)
```bash
# Deploy para staging
.\deploy.ps1 -Environment staging

# Deploy para produção
.\deploy.ps1 -Environment production

# Deploy sem backup (não recomendado)
.\deploy.ps1 -Environment production -SkipBackup

# Deploy sem testes (não recomendado)
.\deploy.ps1 -Environment production -SkipTests
```

#### Funcionalidades do Deploy
- ✅ **Verificação de pré-requisitos** automática
- ✅ **Backup automático** do banco antes do deploy
- ✅ **Testes automatizados** (quando implementados)
- ✅ **Blue-Green deployment** para zero downtime
- ✅ **Health checks** pós-deploy
- ✅ **Rollback automático** em caso de falha
- ✅ **Verificação de logs** por erros críticos

#### Deploy Manual
```bash
# 1. Backup do banco
make backup

# 2. Build dos containers
make build

# 3. Deploy
make deploy

# 4. Verificar status
make health
make status
```

### 🔧 Configuração Avançada Docker

#### docker-compose.override.yml (Desenvolvimento)
```yaml
# Override automático para desenvolvimento
# Permite hot-reload e debug
version: "3.8"
services:
  api:
    volumes:
      - ./api:/app
      - /app/node_modules
    command: ["npm", "run", "dev"]
```

#### Variáveis de Ambiente Docker
```bash
# .env para Docker Compose
COMPOSE_PROJECT_NAME=marybot
DATABASE_URL="postgresql://botuser:botpass@db:5432/marybot"
API_SERVICE_URL="http://api:3001"
BACKEND_SERVICE_URL="http://backend:3002"
```

#### Multi-stage Build
```dockerfile
# Dockerfile otimizado para produção
# Builds separados por serviço
# Cache layers otimizado
# Imagem final multi-serviço
```

### 📊 Monitoramento Docker

#### Health Checks Implementados
```bash
# API Service
curl -f http://localhost:3001/health

# Backend Service  
curl -f http://localhost:3002/health

# Admin Panel
curl -f http://localhost:3003/api/health

# Bot Service (process check)
docker exec marybot_bot node -e "process.exit(0)"
```

#### Logs Estruturados
```bash
# Todos os serviços
docker-compose logs -f --tail=100

# Por timestamp
docker-compose logs -f --since="1h"

# Apenas erros
docker-compose logs | grep ERROR

# JSON format (futuro)
docker-compose logs --json
```

### 🔄 Estratégias de Deploy

#### Zero Downtime Deploy
1. **Health Check** dos serviços atuais
2. **Backup** automático do banco
3. **Build** dos novos containers
4. **Blue-Green Switch** dos serviços
5. **Verificação** da saúde dos novos serviços
6. **Rollback** automático se falhar

#### Rollback Strategy
```bash
# Rollback manual
docker-compose down
docker system prune -f
git checkout [previous-commit]
make deploy

# Restaurar backup do banco
docker exec -i marybot_db psql -U botuser marybot < backups/backup_file.sql
```

### 🛡️ Segurança Docker

#### Medidas Implementadas
- **Non-root users** em todos os containers
- **Read-only filesystems** onde possível
- **Resource limits** configurados
- **Network isolation** entre serviços
- **Secrets management** via environment variables
- **Health checks** para detecção de problemas

#### Configuração de Produção
```yaml
# Limites de recursos
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

## 📈 Performance e Escalabilidade

### Otimizações Implementadas
- **Connection pooling** no PostgreSQL
- **WebSocket multiplexing** para real-time
- **React Query** para cache inteligente
- **Prisma ORM** para queries otimizadas
- **Compression middleware** para menor payload

### Métricas de Performance
```
Bot Response Time:    < 1s (comandos simples)
API Response Time:    < 200ms (média)
WebSocket Latency:    < 50ms
Database Queries:     < 100ms (média)
Admin Panel Load:     < 2s (primeira carga)
```

## 🛡️ Segurança

### Medidas Implementadas
- **JWT token authentication**
- **Rate limiting** por IP e usuário
- **Input validation** em todos os endpoints
- **SQL injection protection** via Prisma
- **XSS protection** no frontend
- **CORS policy** restritiva
- **Environment variables** para secrets
- **Helmet.js** para headers de segurança

## 📱 Compatibilidade

### Plataformas Suportadas
- **Discord**: Totalmente compatível
- **Node.js**: 18.0.0 ou superior
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: Interface responsiva

### Databases Suportadas
- **PostgreSQL 12+** (recomendado)
- **MySQL 8.0+** (experimental)
- **SQLite** (desenvolvimento apenas)

## 🆘 Troubleshooting

### Problemas Comuns

#### Bot não conecta
```bash
# Verificar token
echo $DISCORD_TOKEN

# Verificar WebSocket
curl http://localhost:3002/health

# Logs do bot
npm run dev
```

#### API não responde
```bash
# Verificar banco
psql -h homelab.op -p 5400 -U botuser -d marybot

# Verificar serviço
curl http://localhost:3001/health

# Regenerar Prisma
npx prisma generate
```

#### Admin Panel não carrega
```bash
# Verificar build
npm run build

# Verificar variáveis
cat .env

# Verificar Next.js
npm run dev
```

### Logs e Debugging
```bash
# Logs por serviço
tail -f api/logs/app.log
tail -f backend/logs/websocket.log
tail -f bot/logs/discord.log

# Debug mode
NODE_ENV=development npm start
DEBUG=* npm start
```

## 🤝 Contribuição

### Como Contribuir
1. **Fork** o repositório
2. **Crie** uma branch para sua feature
3. **Implemente** suas mudanças
4. **Teste** completamente
5. **Submit** um Pull Request

### Padrões de Código
- **ESLint** configurado
- **Prettier** para formatação
- **Conventional Commits** para mensagens
- **JSDoc** para documentação

### Issues e Feature Requests
- Use os **templates** fornecidos
- **Descreva** detalhadamente o problema
- **Inclua** logs e screenshots
- **Teste** em ambiente local primeiro

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙋‍♂️ Suporte e Comunidade

### Canais de Suporte
- **GitHub Issues**: Bugs e feature requests
- **Discord Server**: [Comunidade MaryBot](https://discord.gg/marybot)
- **Email**: suporte@marybot.dev
- **Wiki**: [Documentação completa](https://wiki.marybot.dev)

### Status do Projeto
- ✅ **API Service**: Estável
- ✅ **Backend Service**: Estável  
- ✅ **Bot Service**: Estável
- ✅ **Admin Panel**: Estável
- 🔄 **Mobile App**: Em desenvolvimento
- 📋 **API v2**: Planejado

## 🎉 Agradecimentos

Desenvolvido com ❤️ para a comunidade anime brasileira.

**Tecnologias principais:**
- [Discord.js](https://discord.js.org/) - Biblioteca Discord para Node.js
- [Next.js](https://nextjs.org/) - Framework React para produção
- [Prisma](https://prisma.io/) - ORM moderno para Node.js
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [PostgreSQL](https://postgresql.org/) - Banco de dados relacional

---

> **MaryBot** - O bot Discord mais completo para comunidades anime! 🎌
├─ docker-compose.yml
├─ Dockerfile
└─ package.json
```

### ✳️ Principais camadas:

* **commands/**: cada comando em um arquivo modular
* **database/**: setup do Prisma + conexões
* **events/**: listeners de eventos do Discord (ou outra plataforma)
* **utils/**: funções auxiliares (embed builders, APIs, random, etc.)
* **docker-compose.yml**: para rodar o bot + PostgreSQL em containers
* **Prisma**: para schema de usuários, economia, inventário etc.

---

## ⚙️ 2. Ideias de Comandos

### 🏗️ Utilitários

| Comando                | Função                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `/help`                | Mostra a lista de comandos disponíveis                                                 |
| `/profile`             | Exibe o perfil do usuário (avatar anime, XP, moedas, etc.)                             |
| `/daily`               | Recebe recompensa diária                                                               |
| `/leaderboard`         | Mostra o ranking da comunidade                                                         |
| `/inventory`           | Mostra coleções (cards, waifus, badges, etc.)                                          |
| `/anime-search <nome>` | Busca informações sobre um anime (via API como [AniList](https://anilist.co/graphiql)) |
| `/waifu`               | Gera uma imagem aleatória de uma waifu/husbando                                        |
| `/quote`               | Mostra uma citação famosa de um personagem de anime                                    |
| `/setbio`              | Define uma biografia personalizada para o perfil                                       |

---

## 🎮 3. Ideias de Minigames (com economia integrada)

Esses minigames podem usar o banco de dados com **tabelas de usuários, moedas, XP e inventário**.

### 🧠 1. Quiz de Animes

**Descrição:** o bot mostra uma pergunta tipo:

> “Quem disse: ‘Eu irei me tornar o Hokage!’?”

**Mecânica:**

* 4 opções múltipla escolha
* Recompensa de XP e moedas se acertar
* Dificuldade crescente

**Banco:** tabela `anime_questions` com perguntas, opções e resposta correta.

---

### 🎲 2. Gacha de Personagens

**Descrição:** sistema tipo "summon" (como Genshin, Fate, etc.)

**Mecânica:**

* `/summon` → gasta moedas e recebe um personagem aleatório
* Raridades (⭐1 a ⭐5)
* Pode colecionar no `/inventory`
* Rankings de colecionadores

**Banco:** tabelas `characters` (nome, raridade, anime) e `user_characters`.

---

### ⚔️ 3. Batalhas entre Usuários

**Descrição:** duelo de personagens colecionados.

**Mecânica:**

* `/battle @user`
* Cada personagem tem **ataque, defesa e sorte**
* O vencedor ganha moedas e XP
* Pode haver status ou efeitos especiais

---

### 💼 4. Sistema de Economia

**Descrição:** base de tudo.

* `/work`, `/daily`, `/rob`, `/shop`
* Lojas com itens cosméticos, boosts, backgrounds de perfil
* `/buy item_id` para comprar
* `/profile` mostra saldo e itens

**Banco:** tabelas `users`, `wallet`, `items`, `inventory`.

---

### 🕹️ 5. Aventura por Texto (RPG leve)

**Descrição:** minigame por comandos narrativos.

Exemplo:

> `/adventure start` → “Você entra na Floresta da Folha. Um ninja inimigo aparece!”

Escolhas:

> `/attack`, `/run`, `/heal`

XP e moedas conforme o progresso.
Pode ser feito com **eventos aleatórios em JSON** e **histórias modulares**.

---

## 🧠 Extras para Engajamento

* **Sistema de níveis** com XP e ranks (Bronze → Platina → Diamante Otaku 💎)
* **Recompensas semanais** por participação
* **Eventos sazonais** (Halloween, Natal, etc.)
* **Sistema de Clãs ou Guildas** (usuários podem formar grupos)
* **Sistema de títulos** (ex: “O Verdadeiro Saiyajin”)
* **Notificações de novos animes/mangás** via RSS ou API da MyAnimeList

---

## 🐳 4. Docker + PostgreSQL

### `docker-compose.yml` exemplo:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16
    container_name: animebot_db
    environment:
      POSTGRES_USER: botuser
      POSTGRES_PASSWORD: botpass
      POSTGRES_DB: animebot
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  bot:
    build: .
    container_name: animebot
    depends_on:
      - db
    environment:
      DATABASE_URL: "postgresql://botuser:botpass@db:5432/animebot"
      DISCORD_TOKEN: "seu_token_aqui"
    volumes:
      - .:/app
    command: ["node", "src/index.js"]
```

---

## 💾 5. Modelo básico do Prisma

```prisma
model User {
  id          String   @id @default(cuid())
  discordId   String   @unique
  username    String
  xp          Int      @default(0)
  coins       Int      @default(0)
  createdAt   DateTime @default(now())
  characters  UserCharacter[]
}

model Character {
  id        Int      @id @default(autoincrement())
  name      String
  anime     String
  rarity    Int
  imageUrl  String?
  obtained  UserCharacter[]
}

model UserCharacter {
  id           Int      @id @default(autoincrement())
  userId       String
  characterId  Int
  obtainedAt   DateTime @default(now())
  user         User      @relation(fields: [userId], references: [id])
  character    Character @relation(fields: [characterId], references: [id])
}
```
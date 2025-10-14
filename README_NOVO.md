# 🤖 MaryBot - Bot de Comunidade Clube dos Animes

Um bot Discord completo e modular para comunidades de anime com sistema de economia, minigames, gacha de personagens e muito mais!

![Node.js](https://img.shields.io/badge/node.js-18%2B-green)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![Prisma](https://img.shields.io/badge/prisma-v5-purple)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)

## ✨ Funcionalidades

### 🎌 Comandos de Anime
- `/anime-search` - Busca informações detalhadas sobre animes (API AniList)
- `/waifu` - Gera imagens aleatórias de waifus/husbandos
- `/quote` - Mostra citações famosas de personagens de anime

### 🎮 Minigames
- `/quiz` - Quiz interativo sobre animes com recompensas
- `/gacha` - Sistema de invocação de personagens (1x ou 10x)
- `/battle` - Batalhas entre usuários (em desenvolvimento)

### 💰 Sistema de Economia
- `/profile` - Mostra perfil completo do usuário
- `/daily` - Recompensa diária com sistema de streak
- `/leaderboard` - Rankings por XP, moedas, nível ou personagens
- Sistema de níveis e ranks automático
- XP por mensagens e atividades

### 🔧 Comandos Básicos
- `/help` - Menu de ajuda interativo
- `/ping` - Latência do bot

## 🏗️ Arquitetura

```
marybot/
├── src/
│   ├── commands/           # Comandos organizados por categoria
│   │   ├── core/          # Comandos básicos
│   │   ├── anime/         # Comandos de anime
│   │   ├── games/         # Minigames
│   │   └── economy/       # Sistema econômico
│   ├── events/            # Event handlers do Discord
│   ├── utils/             # Funções utilitárias
│   ├── database/          # Configuração do Prisma
│   ├── config.js          # Configurações do bot
│   ├── index.js           # Arquivo principal
│   └── deploy-commands.js # Script para registrar comandos
├── prisma/                # Schema e migrations
├── docker-compose.yml     # Configuração Docker
└── Dockerfile            # Imagem do bot
```

## 🚀 Instalação e Configuração

### 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) 18.x ou superior
- [PostgreSQL](https://www.postgresql.org/) 12.x ou superior
- [Docker](https://www.docker.com/) (opcional)
- Bot Discord criado no [Discord Developer Portal](https://discord.com/developers/applications)

### 🔧 Configuração Local

1. **Clone o repositório**
```bash
git clone https://github.com/LyeZinho/marybot.git
cd marybot
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DISCORD_TOKEN=seu_token_do_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor_teste # (opcional, para desenvolvimento)
DATABASE_URL="postgresql://user:password@localhost:5432/marybot"
NODE_ENV=development
```

4. **Configure o banco de dados**
```bash
# Gerar cliente Prisma
npm run db:generate

# Criar/atualizar banco
npm run db:push

# Popular com dados iniciais (opcional)
npm run db:seed
```

5. **Registre os comandos slash**
```bash
npm run deploy
```

6. **Inicie o bot**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### 🐳 Configuração com Docker

1. **Clone e configure**
```bash
git clone https://github.com/LyeZinho/marybot.git
cd marybot
cp .env.example .env
```

2. **Configure o .env para Docker**
```env
DISCORD_TOKEN=seu_token_do_bot
CLIENT_ID=id_da_aplicacao
DATABASE_URL="postgresql://botuser:botpass@db:5432/marybot"
NODE_ENV=production
```

3. **Inicie com Docker Compose**
```bash
docker-compose up -d
```

4. **Execute migrations e seed**
```bash
# Gerar cliente Prisma
docker-compose exec bot npm run db:generate

# Atualizar banco
docker-compose exec bot npm run db:push

# Popular dados iniciais
docker-compose exec bot npm run db:seed

# Registrar comandos
docker-compose exec bot npm run deploy
```

## 📊 Banco de Dados

O bot utiliza PostgreSQL com Prisma ORM. Principais tabelas:

- **users** - Dados dos usuários (XP, moedas, nível)
- **characters** - Personagens disponíveis no gacha
- **user_characters** - Personagens coletados pelos usuários
- **anime_questions** - Perguntas do quiz
- **anime_quotes** - Citações de anime
- **items** - Itens da loja (em desenvolvimento)

### 🔄 Comandos do Banco

```bash
# Visualizar banco de dados
npm run db:studio

# Reset completo (cuidado!)
npm run db:reset

# Gerar cliente após mudanças no schema
npm run db:generate
```

## 🎮 Sistema de Economia

### 💰 Moedas
- **Daily**: 50-100+ moedas (base + bônus de nível + streak)
- **Quiz**: 15-35 moedas por resposta correta
- **Mensagens**: XP aleatório (chance de 10%)

### ⭐ Sistema de Níveis
- **100 XP = 1 Nível**
- **Ranks**: Bronze → Prata → Ouro → Platina → Diamante

### 🎲 Sistema Gacha
- **Rates**: 1⭐(44%) | 2⭐(30%) | 3⭐(20%) | 4⭐(5%) | 5⭐(1%)
- **Custos**: 50 moedas (1x) | 450 moedas (10x)

## 🔧 Comandos de Administração

```bash
# Scripts NPM disponíveis
npm run start      # Iniciar bot
npm run dev        # Desenvolvimento com watch
npm run deploy     # Registrar comandos slash
npm run db:generate # Gerar cliente Prisma
npm run db:push    # Atualizar banco
npm run db:studio  # Interface web do banco
npm run db:reset   # Reset do banco
npm run db:seed    # Popular dados iniciais
```

## 🐛 Solução de Problemas

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
sudo service postgresql status

# Testar conexão
psql -h localhost -U botuser -d marybot
```

### Comandos não aparecem no Discord
```bash
# Re-registrar comandos
npm run deploy

# Para comandos globais, aguarde até 1 hora
# Para comandos de guild, aparece imediatamente
```

### Erro de permissões
- Verifique se o bot tem as permissões necessárias no servidor
- Intents necessárias: Guilds, Guild Messages, Message Content

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/LyeZinho/marybot/issues)
- **Discord**: [Servidor de Suporte](#) (em breve)
- **Email**: [contato](#) (em breve)

---

Desenvolvido com ❤️ por [LyeZinho](https://github.com/LyeZinho)
# 🤖 MaryBot - Discord Bot Moderno

Um bot Discord avançado com sistema prefix-based, focado em comandos de anime e economia, construído com Discord.js v14 e Prisma ORM.

## ✨ Características

- 🎯 **Sistema prefix-based** (`m.` por padrão)
- 🎌 **Comandos de anime** (waifus, citações, etc.)
- 💰 **Sistema de economia** completo com banco de dados
- 🗄️ **PostgreSQL** com Prisma ORM
- 🐳 **Docker** para fácil deploy
- 📊 **Sistema de logs** avançado
- ⚡ **Carregamento dinâmico** de comandos
- 🔒 **Sistema de permissões** e cooldowns

## 📁 Estrutura do Projeto

```
marybot/
├─ src/
│  ├─ commands/
│  │  ├─ core/           # Comandos essenciais (ping, help)
│  │  ├─ anime/          # Comandos relacionados a anime
│  │  └─ economy/        # Sistema de economia
│  ├─ database/
│  │  ├─ prisma/
│  │  └─ client.js       # Cliente do banco de dados
│  ├─ events/            # Eventos do Discord
│  ├─ utils/             # Utilitários (embeds, logger)
│  ├─ config.js          # Configurações do bot
│  └─ index.js           # Arquivo principal
├─ prisma/
│  └─ schema.prisma      # Schema do banco de dados
├─ docker-compose.yml    # Configuração do Docker
├─ Dockerfile           # Imagem do bot
└─ package.json         # Dependências do projeto
```

## 🚀 Instalação Rápida

### Pré-requisitos
- Node.js 18+ 
- Docker e Docker Compose (opcional)
- Token do bot Discord

### 1. Clone o repositório
```bash
git clone https://github.com/LyeZinho/marybot.git
cd marybot
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DISCORD_TOKEN=seu_token_aqui
DATABASE_URL="postgresql://botuser:botpass@localhost:5432/marybot?schema=public"
OWNER_ID=seu_id_discord
```

### 4. Configure o banco de dados

#### Opção A: Docker (Recomendado)
```bash
docker-compose up -d db
npm run db:push
```

#### Opção B: PostgreSQL local
```bash
# Instale PostgreSQL e crie o banco 'marybot'
npm run db:push
```

### 5. Execute o bot
```bash
npm start
```

## 🐳 Deploy com Docker

### Desenvolvimento
```bash
# Iniciar apenas o banco
docker-compose up -d db

# Executar bot localmente
npm run dev
```

### Produção
```bash
# Construir e executar tudo
docker-compose up -d

# Ver logs
docker-compose logs -f bot
```

### Prisma Studio (Opcional)
```bash
# Iniciar interface web do banco
docker-compose --profile dev up prisma-studio
# Acesse: http://localhost:5555
```

## 📝 Comandos Disponíveis

### ⚙️ Core
- `m.ping` - Mostra latência do bot
- `m.help` - Lista todos os comandos

### 🎌 Anime  
- `m.waifu` - Imagem aleatória de waifu
- `m.quote` - Citação inspiradora de anime

### 💰 Economy
- `m.daily` - Recompensa diária
- `m.profile` - Perfil do usuário

## 🛠️ Scripts NPM

```bash
npm start          # Executar bot em produção
npm run dev        # Executar com watch mode
npm run db:push    # Aplicar schema ao banco
npm run db:migrate # Criar nova migration
npm run db:studio  # Abrir Prisma Studio
npm run db:generate # Gerar cliente Prisma
```

## 🔧 Configuração Avançada

### Adicionando novos comandos

1. Crie um arquivo em `src/commands/categoria/`
2. Use a estrutura padrão:

```js
export default {
  name: "comando",
  description: "Descrição do comando",
  category: "categoria",
  cooldown: 3000, // ms
  
  async execute(client, message, args) {
    // Lógica do comando
  },
};
```

### Configurações do banco

Edite `prisma/schema.prisma` para modificar o schema do banco:

```bash
# Após editar o schema
npm run db:push
```

### Variáveis de ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DISCORD_TOKEN` | Token do bot | ✅ |
| `DATABASE_URL` | URL do PostgreSQL | ✅ |
| `NODE_ENV` | Ambiente (development/production) | ❌ |
| `OWNER_ID` | ID do desenvolvedor | ❌ |

## 📊 Sistema de Economia

O bot inclui um sistema completo de economia com:

- 💰 **Moedas virtuais** (carteira + banco)
- 🎁 **Recompensas diárias** com streaks
- 📈 **Sistema de XP** e níveis
- 📊 **Ranking** de usuários
- 💾 **Histórico** de transações

## 🔍 Logs e Monitoramento

O sistema de logs inclui:
- ✅ Comandos executados
- ❌ Erros e exceções  
- 📊 Status do banco de dados
- 🔄 Eventos do bot

## 🛡️ Segurança

- 🔒 Comandos com **permissões**
- ⏰ Sistema de **cooldown**
- 👑 Comandos **apenas para owner**
- 🛡️ **Validação** de entrada

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 **Email**: [seu_email@gmail.com](mailto:seu_email@gmail.com)
- 💬 **Discord**: SeuUsuario#1234
- 🐛 **Issues**: [GitHub Issues](https://github.com/LyeZinho/marybot/issues)

## 🎯 Roadmap

- [ ] Sistema de inventário
- [ ] Comandos de moderação
- [ ] Sistema de música
- [ ] Dashboard web
- [ ] API REST
- [ ] Sistema de plugins

---

⭐ **Não esqueça de dar uma estrela se este projeto te ajudou!**
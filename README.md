# 🤖 MaryBot - Discord Bot Moderno

Um bot Discord avançado com sistema prefix-based, focado em comandos de anime e economia, construído com Discord.js v14 e Prisma ORM.

## ✨ Características

- 🎯 **Sistema prefix-based** (`m.` por padrão)
- 🎌 **Comandos de anime** (waifus, citações, etc.)
- 💰 **Sistema de economia** completo com banco de dados
- 🏰 **Sistema de Dungeon** com mapas visuais procedurais
- 🗺️ **Mapas em PNG** gerados dinamicamente com SVG
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
│  │  ├─ dungeon/        # Sistema de exploração de dungeons
│  │  └─ economy/        # Sistema de economia
│  ├─ database/
│  │  ├─ prisma/
│  │  └─ client.js       # Cliente do banco de dados
│  ├─ events/            # Eventos do Discord
│  ├─ game/              # Motores de jogo (dungeon, combate)
│  ├─ utils/             # Utilitários (embeds, mapas visuais, logger)
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
DATABASE_URL="postgresql://botuser:botpass@localhost:5433/marybot?schema=public"
OWNER_ID=seu_id_discord
```

**Importante**: Note que a porta do banco é **5433** (não 5432) para evitar conflitos.

### 4. Configure o banco de dados

#### Opção A: Docker (Recomendado)
```bash
# Iniciar apenas o banco de dados
docker-compose up -d db

# OU usar o script de gerenciamento
./manage.sh start-db        # Linux/Mac
manage.bat start-db         # Windows

# Aplicar schema do banco
npm run db:push
```

**Nota**: O banco será iniciado na porta **5433** para evitar conflitos com PostgreSQL locais.

#### Opção B: PostgreSQL local
```bash
# Instale PostgreSQL e crie o banco 'marybot'
# Atualize a DATABASE_URL no .env para sua configuração
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
# OU usar script
./manage.sh start-db        # Linux/Mac
manage.bat start-db         # Windows

# Executar bot localmente
npm run dev
```

### Produção
```bash
# Construir e executar tudo
docker-compose up -d
# OU usar script
./manage.sh start-all       # Linux/Mac
manage.bat start-all        # Windows

# Ver logs
docker-compose logs -f bot
# OU usar script
./manage.sh logs-bot        # Linux/Mac
manage.bat logs-bot         # Windows
```

### Prisma Studio (Opcional)
```bash
# Iniciar interface web do banco
docker-compose --profile dev up prisma-studio
# OU usar script
./manage.sh studio          # Linux/Mac
manage.bat studio           # Windows
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

### 🏰 Dungeon (Sistema de Exploração)
- `m.dungeon start` - Inicia uma nova aventura na dungeon
- `m.dungeon status` - Mostra status atual da dungeon
- `m.dungeon exit` - Sai da dungeon atual
- `m.move [direction]` - Move-se pela dungeon (north/south/east/west)
- `m.look` - Observa a sala atual em detalhes
- `m.map` - **Mapa visual em PNG** da dungeon atual
- `m.map full` - Mapa visual completo da dungeon
- `m.map text` - Mapa em modo texto (clássico)
- `m.inventory` - Mostra inventário e equipamentos

#### ⚔️ Sistema de Combate
- `m.attack` - Ataca inimigos em batalha
- `m.skill [habilidade]` - Usa habilidades especiais
- `m.status` - Status da batalha atual
- `m.run` - Tenta fugir da batalha

#### 🎒 Sistema de Itens
- `m.loot` - **Coleta tesouros** de salas de loot
- `m.item [nome]` - **Informações detalhadas** sobre itens
- `m.item list [categoria]` - Lista todos os itens disponíveis
- `m.shop` - **Interage com lojas** nas dungeons
- `m.shop buy [item]` - Compra itens em lojas

#### 🎮 Características do Sistema de Dungeon
- **Mapas Procedurais**: Cada dungeon é única baseada em seed
- **Biomas Variados**: Cripta Sombria, Vulcão Ardente, Floresta Perdida, etc.
- **Mapas Visuais**: Geração automática de mapas em PNG com SVG
- **Exploração Progressiva**: Descubra salas conforme explora
- **Sistema de Combate Visual**: Batalhas com mobs únicos e habilidades
- **Sistema de Itens Completo**: 17+ itens com raridades e efeitos
- **Diferentes Tipos de Sala**: Monstros, armadilhas, tesouros, lojas, chefes
- **Persistência**: Progresso salvo no banco de dados PostgreSQL

#### 🎒 Sistema de Itens Detalhado
- **6 Raridades**: Comum, Incomum, Raro, Épico, Lendário, Mítico
- **8 Categorias**: Consumíveis, Armas, Armaduras, Acessórios, Materiais, Tesouros, Chaves, Missão
- **Loot Tables Dinâmicas**: Drops baseados em andar e bioma
- **Modificadores de Bioma**: Itens especiais por região
- **Sistema de Preços**: Valores automáticos com multiplicadores de raridade
- **Lojas Procedurais**: Comerciantes com estoque limitado e preços variáveis

## 🛠️ Scripts NPM

```bash
npm start          # Executar bot em produção
npm run dev        # Executar com watch mode
npm run db:push    # Aplicar schema ao banco
npm run db:migrate # Criar nova migration
npm run db:studio  # Abrir Prisma Studio
npm run db:generate # Gerar cliente Prisma
```

## 🎮 Exemplos de Uso

### Explorando uma Dungeon

```
> m.dungeon start
🏰 Nova Aventura Iniciada!
Você está em uma Cripta Sombria...

> m.move north
⬆️ Movimento Realizado
💰 Sala Atual: Tesouro

> m.loot
💰 Tesouro Coletado!
🟢 Poção de Cura Média x2 (Incomum) - 75g
⚫ Moedas de Ouro x35 - 35g

> m.move east
🏪 Sala Atual: Loja

> m.shop
🏪 Loja da Dungeon
1. ⚫ Poção de Cura Pequena (2 em estoque) - 18 moedas
2. 🟢 Espada de Ferro (1 em estoque) - 150 moedas

> m.shop buy 1
🛒 Compra Realizada!
Você comprou Poção de Cura Pequena por 18 moedas.
```

### Sistema de Itens

```
> m.item list
🎒 Lista de Itens
🧪 Consumíveis (5): ⚫ Poção de Cura Pequena, 🟢 Poção de Cura Média...
⚔️ Armas (2): ⚫ Espada de Ferro, 🟢 Espada de Aço...
🛡️ Armaduras (2): ⚫ Armadura de Couro, 🟢 Cota de Malha...

> m.item espada de ferro
⚫ Espada de Ferro
Uma espada bem forjada que oferece bom dano de ataque.
⚔️ Atributos: ATK: +10, CRIT: +5%
💰 Valor de Venda: 100 moedas
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

## 🔧 Resolução de Problemas

### Porta 5432 já está em uso
```bash
# O bot usa porta 5433 por padrão para evitar conflitos
# Se ainda houver conflito, edite docker-compose.yml:
# ports: - "NOVA_PORTA:5432"
```

### Bot não conecta ao banco
```bash
# Verificar se o banco está rodando
docker-compose ps

# Ver logs do banco
./manage.sh logs-db        # Linux/Mac
manage.bat logs-db         # Windows

# Reiniciar serviços
./manage.sh restart        # Linux/Mac
manage.bat restart         # Windows
```

### Erro "Token inválido"
```bash
# Verificar se o .env está configurado corretamente
cat .env                   # Linux/Mac
type .env                  # Windows

# Verificar se o token está correto no Discord Developer Portal
```

### Comandos não funcionam
```bash
# Verificar logs do bot
./manage.sh logs-bot       # Linux/Mac
manage.bat logs-bot        # Windows

# Verificar se o bot tem permissões no servidor Discord
# Verificar se o prefix está correto (padrão: m.)
```

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
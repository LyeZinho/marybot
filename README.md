# 🤖 Bot de Comunidade Clube dos Animes

## 🧩 1. Estrutura do Bot

Um bot de comunidade (ex: Discord, Telegram, etc.) precisa ser modular e escalável.
Segue uma estrutura base de diretórios pensada para JS moderno (Node 18+ ou Bun):

```
anime-bot/
├─ src/
│  ├─ commands/
│  │  ├─ core/
│  │  │   ├─ help.js
│  │  │   ├─ ping.js
│  │  ├─ anime/
│  │  │   ├─ search.js
│  │  │   ├─ quote.js
│  │  │   ├─ waifu.js
│  │  ├─ games/
│  │  │   ├─ quiz.js
│  │  │   ├─ gacha.js
│  │  │   ├─ battle.js
│  │  └─ economy/
│  │      ├─ daily.js
│  │      ├─ profile.js
│  │      ├─ leaderboard.js
│  ├─ database/
│  │  ├─ prisma/
│  │  │   ├─ schema.prisma
│  │  └─ client.js
│  ├─ events/
│  │  ├─ messageCreate.js
│  │  ├─ interactionCreate.js
│  │  └─ ready.js
│  ├─ utils/
│  │  ├─ embeds.js
│  │  ├─ random.js
│  │  ├─ animeApi.js
│  ├─ config.js
│  └─ index.js
├─ prisma/
│  └─ schema.prisma
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
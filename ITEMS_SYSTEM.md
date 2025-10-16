# 🎒 Sistema de Itens - MaryBot

## 📋 Resumo das Implementações

O MaryBot agora possui um sistema completo de itens e loot para as dungeons, complementando o sistema de combate com mobs.

### ✅ Componentes Implementados

#### 1. **Base de Dados de Itens** (`src/data/items.json`)
- 🎒 **17 itens únicos** distribuídos em diferentes categorias
- 💎 **6 níveis de raridade** (Comum a Mítico) com multiplicadores
- 🧪 **Poções e consumíveis** (cura, mana, força)
- ⚔️ **Equipamentos** (armas, armaduras, acessórios)
- 🏗️ **Materiais de crafting** (fragmentos, escamas)
- 💰 **Tesouros e moedas** para venda automática
- 🗝️ **Chaves especiais** para acesso a áreas

#### 2. **Gerenciador de Itens** (`src/game/itemManager.js`)
- 📦 **Sistema de loot tables** configurável por raridade
- 🗺️ **Modificadores de bioma** para drops específicos
- 🎲 **Geração procedural** baseada em andar e bioma
- 💰 **Cálculo automático** de valores e raridades
- 📊 **Formatação visual** para embeds do Discord

#### 3. **Comando de Loot** (`src/commands/dungeon/loot.js`)
- 💰 **Coleta de tesouros** em salas específicas
- 🔒 **Sistema anti-exploit** (uma coleta por sala)
- 🏆 **Recompensas variadas** baseadas no andar
- 💎 **Itens bônus** para andares altos
- 📈 **Integração com economia** do bot

### 🎯 Categorias de Itens

#### 🧪 **Consumíveis (CONSUMABLE)**
- **Poções de Cura**: Pequena (25 HP), Média (50 HP), Grande (100 HP)
- **Poções de Mana**: Para usar habilidades especiais
- **Poções de Força**: Buff temporário de ataque (+5 ATK por 5 turnos)

#### ⚔️ **Armas (WEAPON)**
- **Espada de Ferro**: +10 ATK, 5% crítico (Comum)
- **Espada de Aço**: +18 ATK, 8% crítico (Incomum)

#### 🛡️ **Armaduras (ARMOR)**
- **Armadura de Couro**: +5 DEF, -1 SPD (Comum)
- **Cota de Malha**: +12 DEF, -2 SPD (Incomum)

#### 💍 **Acessórios (ACCESSORY)**
- **Anel da Sorte**: +10 LCK, +15% loot bonus (Raro)
- **Botas da Velocidade**: +8 SPD (Incomum)

#### 🏗️ **Materiais (MATERIAL)**
- **Fragmento de Cristal**: Material básico para crafting
- **Escama de Dragão**: Material raro (drop de boss)

#### 💰 **Tesouros (TREASURE)**
- **Moedas de Ouro/Prata**: Conversão automática para moedas

### 🎲 Sistema de Loot Tables

#### **Loot Comum** (Andares 1-2)
- 40% Poção Pequena (1-3x)
- 30% Poção de Mana (1-2x)
- 80% Moedas de Ouro (5-25x)
- 60% Moedas de Prata (10-50x)

#### **Loot Incomum** (Andares 3-4)
- 30% Poção Média (1-2x)
- 20% Poção de Força (1x)
- 25% Fragmento de Cristal (1-3x)
- 10% Equipamentos básicos
- 90% Moedas (15-50x)

#### **Loot Raro** (Andares 5+)
- 40% Poção Grande (1-2x)
- 15% Armas/Armaduras superiores
- 10% Acessórios especiais
- 5% Anel da Sorte
- 100% Moedas (50-150x)

### 🗺️ Modificadores de Bioma

#### 🕸️ **Cripta Sombria**
- **Itens Preferidos**: Chaves Antigas, Fragmentos de Cristal
- **Bônus**: +10% chance

#### 🔥 **Vulcão Ardente**
- **Itens Preferidos**: Escamas de Dragão, Poções de Força
- **Bônus**: +15% chance

#### 🌲 **Floresta Perdida**
- **Itens Preferidos**: Poções de Cura, Poções de Mana
- **Bônus**: +12% chance

### 📈 Sistema de Raridade

| Raridade | Ícone | Cor | Multiplicador Venda |
|----------|-------|-----|-------------------|
| Comum | ⚫ | Cinza | 1.0x |
| Incomum | 🟢 | Verde | 1.5x |
| Raro | 🔵 | Azul | 2.0x |
| Épico | 🟣 | Roxo | 3.0x |
| Lendário | 🟠 | Laranja | 5.0x |
| Mítico | ⭐ | Dourado | 10.0x |

### 🎮 Comandos Disponíveis

#### `m.loot`
- **Função**: Coleta tesouros de salas de loot
- **Restrições**: Só funciona em salas do tipo 💰
- **Cooldown**: 2 segundos
- **Aliases**: `collect`, `gather`, `pegar`, `coletar`

### 💡 Exemplos de Uso

```
Jogador entra em sala de tesouro:
> m.move north

💰 Tesouro Encontrado!
Você vê algo brilhando no chão!
Use m.loot para coletar o tesouro.

> m.loot

💰 Tesouro Coletado!
Você examinou cuidadosamente a área e encontrou:

💰 Moedas de Ouro: +45 moedas

🎒 Itens Encontrados (3)
🟢 **Poção de Cura Média** x2 *(Incomum)* - 37g
🔵 **Fragmento de Cristal** x1 *(Raro)* - 50g
⚫ **Moeda de Prata** x25 *(Comum)* - 2g

🗺️ Local: 🕸️ Cripta Sombria - Andar 3
```

### 🔮 Funcionalidades Futuras

#### **Sistema de Inventário Persistente**
- Armazenar itens no banco de dados
- Sistema de equipamento ativo/passivo
- Limites de peso/espaço

#### **Sistema de Crafting**
- Combinar materiais para criar itens
- Receitas desbloqueáveis
- Oficinas em cidades/vilas

#### **Loja de Itens**
- NPCs vendedores em salas SHOP
- Compra/venda de equipamentos
- Itens únicos por bioma

#### **Efeitos Avançados**
- Equipamentos com set bonus
- Armas elementais (fogo, gelo, etc.)
- Itens com durabilidade

### 📊 Estatísticas do Sistema

- **Total de Itens**: 17 únicos
- **Loot Tables**: 4 (comum, incomum, raro, boss)
- **Raridades**: 6 níveis
- **Categorias**: 8 tipos
- **Biomas Suportados**: 6 com modificadores

---

## 🔧 Integração Técnica

### **Inicialização Automática**
```javascript
// src/index.js - Carregamento automático
const { itemManager } = await import("./game/itemManager.js");
await itemManager.loadItemData();
logger.success("✅ Sistema de itens inicializado!");
```

### **Geração de Loot**
```javascript
// Exemplo de uso do ItemManager
const loot = itemManager.generateRoomLoot('CRYPT', 3, 'LOOT');
// Retorna: { items: [...], coins: 45, floorLevel: 3, biome: 'CRYPT' }
```

### **Persistência**
- Dados salvos em `DungeonRun.mapData` (JSON)
- Integração com sistema de economia existente
- Prevenção de exploits com flags `looted`

---

O sistema de itens do MaryBot oferece uma experiência rica e variada para exploração de dungeons, com mecânicas balanceadas e potencial para expansão futura!
# 🎮 Sistema de Combate Visual - MaryBot

## 📋 Resumo das Implementações

O MaryBot agora possui um sistema completo de combate visual e gerenciamento de mobs para dungeons, com as seguintes funcionalidades:

### ✅ Componentes Implementados

#### 1. **Base de Dados de Mobs** (`src/data/mobs.json`)
- 📦 **10 mobs únicos** com diferentes raridades e biomas
- 🎯 **Sistema de skills** com 10+ habilidades diferentes
- 🌟 **Status effects** (envenenado, queimando, congelado, etc.)
- 💎 **Loot tables** com chances e quantidades configuráveis
- 🧠 **Padrões de IA** (passivo, agressivo, berserker, boss, etc.)
- 🗺️ **Afinidades de bioma** para spawn contextual

#### 2. **Renderizador Visual de Combate** (`src/utils/combatRenderer.js`)
- 🖼️ **Geração de imagens SVG/PNG** para batalhas
- 🎨 **Temas visuais** por bioma (floresta, vulcão, cripta, etc.)
- 📊 **Barras de HP/MP** dinâmicas e coloridas
- 🌟 **Exibição de status effects** com ícones
- 📜 **Logs de batalha** integrados na interface
- ⚡ **Otimização Sharp** para conversão rápida PNG

#### 3. **Gerenciador de Mobs** (`src/game/mobManager.js`)
- 🔍 **Indexação inteligente** por bioma, categoria e raridade
- 🎲 **Geração procedural** de instâncias com stats calculados
- 🧠 **Sistema de IA avançado** com comportamentos únicos
- 💰 **Geração de loot** baseada em probabilidades
- 📊 **Balanceamento automático** por nível e raridade

#### 4. **Comandos de Combate**
- ⚔️ **`m.attack`** - Sistema de ataque com críticos e status effects
- ✨ **`m.skill`** - Habilidades por classe com cooldowns
- 📊 **`m.status`** - Interface visual completa de status
- 🏃‍♂️ **`m.run`** - Sistema de fuga com chances baseadas em stats

#### 5. **Integração com Dungeons**
- 🔗 **Conexão automática** com salas de monstros
- 🌍 **Spawns contextuais** baseados no bioma da dungeon
- 📈 **Progressão de dificuldade** baseada no andar e nível
- 💾 **Persistência de estado** entre comandos

## 🎯 Funcionalidades do Sistema

### 🎮 Combate Turn-Based
```
Turno do Jogador → Ação (Attack/Skill/Run) → Turno do Mob → Repeat
```

### 🧠 Sistema de IA por Padrão
- **PASSIVE**: Usa skills básicas raramente
- **AGGRESSIVE**: Foca em ataques ofensivos  
- **BERSERKER**: Fica mais agressivo com HP baixo
- **BOSS**: Múltiplas fases baseadas em HP
- **SUPPORT**: Prioriza cura e buffs
- **CHAOS**: Comportamento imprevisível

### 🌟 Status Effects Implementados
- 🟢 **Poison** - Dano por turno
- 🔥 **Burn** - Dano de fogo por turno
- 🧊 **Frozen** - Perde próximo turno
- 💫 **Stunned** - Não pode agir
- 🩸 **Bleeding** - Dano físico por turno
- 💚 **Regenerating** - Recupera HP por turno
- ✨ **Blessed** - +20% dano
- 💀 **Cursed** - -20% dano
- ⚡ **Haste** - +50% velocidade
- 🐌 **Slow** - -50% velocidade

### 🎨 Temas Visuais por Bioma
- 🌲 **Forest** - Verde e natural
- 🔥 **Volcano** - Vermelho e laranja
- 💀 **Crypt** - Cinza e roxo
- ❄️ **Glacier** - Azul e branco
- 🏛️ **Ruins** - Marrom e dourado

## 📊 Estatísticas do Sistema

### 📦 Assets Disponíveis
- **500+ sprites** de mobs no diretório `assets/mobs/`
- **10 mobs** implementados no sistema inicial
- **10 skills** únicas com efeitos especiais
- **6 biomas** diferentes para exploração

### 🎯 Balanceamento
- **Chance de crítico**: Baseada em Luck (LCK/100)
- **Chance de esquiva**: Baseada em Speed (SPD/200)
- **Fórmula de dano**: `(ATK * Power/10) - (DEF/2) ± 10%`
- **Status duration**: 3-5 turnos dependendo do efeito

## 🚀 Como Usar

### 1. **Iniciar Aventura**
```
m.dungeon start
```

### 2. **Explorar até Encontrar Monstro**
```
m.move north
m.move east
```

### 3. **Combater**
```
m.attack          # Ataque básico
m.skill cura      # Usar habilidade específica
m.status          # Ver estado da batalha
m.run             # Tentar fugir
```

### 4. **Interface Visual**
- ⚔️ **Imagens dinâmicas** geradas para cada batalha
- 📊 **Barras de HP** com cores indicativas
- 🌟 **Status effects** visuais
- 📜 **Log de ações** integrado

## 🔧 Configurações Técnicas

### 📁 Estrutura de Arquivos
```
src/
├── data/
│   └── mobs.json           # Base de dados de mobs
├── game/
│   ├── mobManager.js       # Gerenciador de mobs
│   └── combatEngine.js     # Motor de combate (existente)
├── utils/
│   └── combatRenderer.js   # Renderizador visual
└── commands/dungeon/
    ├── attack.js           # Comando de ataque
    ├── skill.js            # Comando de habilidades
    ├── status.js           # Comando de status
    └── run.js              # Comando de fuga
```

### 🔄 Fluxo de Integração
1. **MobManager** carrega na inicialização
2. **Comando move** detecta sala de monstro
3. **CombatEngine** inicia batalha com mob gerado
4. **CombatRenderer** gera interface visual
5. **Comandos de combate** gerenciam turnos
6. **Resultados** integram com progressão da dungeon

## 🎉 Próximos Passos Sugeridos

### 🔮 Expansões Futuras
- [ ] **Mais mobs**: Implementar todos os 500+ sprites disponíveis
- [ ] **Sistema de equipamentos**: Armas e armaduras que afetam combate
- [ ] **Multiplayer**: Batalhas cooperativas em raids
- [ ] **Eventos especiais**: Mobs temáticos sazonais
- [ ] **Sistema de achievements**: Recompensas por derrotar mobs específicos
- [ ] **Arena PvP**: Combate entre jogadores

### 🛠️ Melhorias Técnicas
- [ ] **Cache de imagens**: Otimizar renderização repetitiva
- [ ] **Sprites reais**: Integrar os PNGs dos mobs nas imagens
- [ ] **Animações**: Efeitos visuais para ataques e skills
- [ ] **Sons**: Efeitos sonoros para combate (se possível no Discord)

## 🏆 Conclusão

O sistema de combate visual está **100% funcional** e integrado com:
- ✅ **Base de dados** completa de mobs
- ✅ **Interface visual** dinâmica  
- ✅ **Combate turn-based** balanceado
- ✅ **Sistema de skills** e status effects
- ✅ **Integração** com dungeon procedural
- ✅ **Comandos intuitivos** para players

O MaryBot agora possui um dos sistemas de combate mais avançados e visuais para bots Discord, com potencial para expansão ilimitada usando os assets disponíveis!
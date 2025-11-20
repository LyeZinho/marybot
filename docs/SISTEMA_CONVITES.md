# 🎯 Sistema de Convites/Afiliados

Sistema completo de recompensas por convites com prevenção de fraudes e análise detalhada.

## 📋 Funcionalidades

### 🎯 Para Usuários
- **Criar convites personalizados** com `/invite create`
- **Ver estatísticas pessoais** com `/invite stats`
- **Ranking do servidor** com `/invite leaderboard`
- **Recompensas automáticas** por convites válidos
- **Bônus por marcos** (ex: 10, 25, 50 convites)

### 👑 Para Administradores
- **Configuração completa** com `/invite-config`
- **Ativar/desativar sistema** por servidor
- **Definir recompensas** e limites de segurança
- **Auditoria de convites suspeitos**
- **Estatísticas detalhadas** do servidor
- **Logs automáticos** de atividade

## ⚙️ Configuração

### Ativação Básica
```bash
/invite-config toggle ativado:true
/invite-config reward valor:100
```

### Configurações de Segurança
```bash
# Conta deve ter pelo menos 7 dias
/invite-config limits idade_minima:7

# Membro deve ficar 24h no servidor
/invite-config limits tempo_minimo:24

# Máximo 1000 coins por dia por usuário
/invite-config limits limite_diario:1000
```

### Bônus por Marcos
```bash
# Exemplo: 10 convites = +500 coins, 25 = +1000 coins
/invite-config bonus marcos:{"10": 500, "25": 1000, "50": 2500}
```

### Canal de Logs
```bash
/invite-config logs canal:#logs-convites
```

## 🛡️ Sistema Anti-Fraude

### Detecção Automática
- **Idade da conta** muito nova
- **Nomes suspeitos** (muitos números)
- **Avatares padrão** (sem personalização)
- **Comportamento anômalo** (entrada/saída rápida)

### Score de Fraude (0-1)
- `0.0-0.3`: **Verde** - Convite normal
- `0.3-0.7`: **Amarelo** - Suspeito moderado  
- `0.7-1.0`: **Vermelho** - Altamente suspeito

### Fatores Considerados
| Fator | Impacto | Descrição |
|-------|---------|-----------|
| Conta nova (< 3 dias) | +0.4 | Conta muito recente |
| Conta nova (3-7 dias) | +0.2 | Conta recente |
| Username com números | +0.2 | > 50% números no nome |
| Avatar padrão | +0.1 | Sem avatar personalizado |
| Nome muito curto/longo | +0.1 | < 3 ou > 20 caracteres |

## 💰 Sistema de Recompensas

### Recompensas Base
- **Por convite válido**: Configurável (padrão: 100 coins)
- **Limite diário**: Configurável (padrão: 1000 coins)
- **Processamento**: Automático na entrada do membro

### Bônus por Marcos
```json
{
  "5": 500,    // 5 convites = +500 coins
  "10": 1000,  // 10 convites = +1000 coins  
  "25": 2500,  // 25 convites = +2500 coins
  "50": 5000,  // 50 convites = +5000 coins
  "100": 10000 // 100 convites = +10000 coins
}
```

### Validação de Convites
✅ **Válidos**:
- Conta com idade adequada
- Score de fraude baixo
- Não é bot
- Permanece tempo mínimo

❌ **Inválidos**:
- Conta muito nova
- Score de fraude alto
- Bot ou conta fake
- Sai muito rápido

## 📊 Estatísticas Disponíveis

### Para Usuários (`/invite stats`)
- Total de convites válidos
- Coins ganhos total
- Convites ativos (links criados)
- Média de coins por convite
- Próximo marco de bônus

### Para Admins (`/invite-config stats`)
- Total de entradas no servidor
- Taxa de convites válidos
- Coins distribuídos total
- Top 3 convidadores
- Estatísticas de fraude

## 🔍 Sistema de Auditoria

### Logs Automáticos
- Convites criados
- Novos membros e origem
- Recompensas distribuídas
- Casos suspeitos detectados
- Bônus de marco atingidos

### Auditoria Manual (`/invite-config audit`)
- Lista convites marcados como fraude
- Detalhes dos casos suspeitos
- Filtro por usuário específico
- Histórico de ações

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
1. **`invites`** - Convites criados
2. **`invite_uses`** - Uso de convites e recompensas
3. **`invite_config`** - Configurações por servidor

### Dados Rastreados
- Código do convite usado
- Timestamp de entrada/saída
- Score de fraude calculado
- Recompensas distribuídas
- Motivos de invalidação

## 📝 Comandos Disponíveis

### Usuários
| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/invite stats` | Ver suas estatísticas | - |
| `/invite leaderboard` | Ranking do servidor | `pagina:2` |
| `/invite create` | Criar novo convite | `usos:10 duracao:24` |

### Administradores  
| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/invite-config toggle` | Ativar/desativar | `ativado:true` |
| `/invite-config reward` | Definir recompensa | `valor:150` |
| `/invite-config limits` | Configurar limites | `idade_minima:10` |
| `/invite-config bonus` | Bônus por marcos | `marcos:{"10":500}` |
| `/invite-config logs` | Canal de logs | `canal:#logs` |
| `/invite-config view` | Ver config atual | - |
| `/invite-config stats` | Stats do servidor | - |
| `/invite-config audit` | Auditoria | `usuario:@user` |

## 🚀 Implementação

### 1. Migration do Banco
```bash
npx prisma migrate dev --name add_invite_system
```

### 2. Sincronização Automática
- Na inicialização do bot
- A cada novo convite criado
- Quando membro entra/sai

### 3. Eventos Monitorados
- `guildMemberAdd` - Processar convites
- `guildMemberRemove` - Marcar saídas
- `ready` - Sincronização inicial

## 🔧 Manutenção

### Limpeza Automática
- **Diária**: Cache de recompensas
- **Semanal**: Logs antigos (opcional)
- **Mensal**: Dados de teste

### Monitoramento
- Score de fraude por servidor
- Taxa de convites válidos
- Distribuição de recompensas
- Padrões suspeitos

## 💡 Dicas de Uso

### Para Comunidades
1. **Configurar idade mínima** adequada (7-14 dias)
2. **Definir limite diário** para evitar spam
3. **Usar bônus por marcos** para incentivar
4. **Monitorar auditoria** regularmente

### Para Moderação
1. **Canal de logs dedicado** para transparência
2. **Verificar casos suspeitos** semanalmente  
3. **Ajustar configurações** conforme necessário
4. **Comunicar regras** claramente aos membros

## 🔒 Segurança

### Prevenções Implementadas
- ✅ Detecção de contas fake
- ✅ Limite de recompensas diárias
- ✅ Rastreamento de tempo de permanência
- ✅ Score automático de fraude
- ✅ Logs detalhados de auditoria
- ✅ Configuração flexível por servidor

### Recomendações Adicionais
- Revisar configurações mensalmente
- Monitorar padrões de entrada
- Manter comunicação clara sobre regras
- Considerar períodos de carência para novos membros
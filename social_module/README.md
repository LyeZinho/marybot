# 📊 Módulo Social MaryBot

Sistema avançado de coleta e análise de mensagens para enriquecimento de contexto conversacional com IA.

## 🎯 Funcionalidades

### 📨 Coleta Inteligente de Mensagens
- **Captura automática**: Todas as mensagens dos usuários são coletadas e analisadas
- **Análise de sentimento**: Sistema básico de detecção de emoções e humor
- **Extração de tópicos**: Identificação automática de palavras-chave e interesses
- **Contexto temporal**: Rastreamento de quando e como os usuários interagem

### 🧠 Contexto Conversacional
- **Histórico personalizado**: Mantém contexto individual para cada usuário
- **Análise de padrões**: Detecta estilo de comunicação e preferências
- **Memória conversacional**: Lembra de interações anteriores com o bot
- **Perfil comportamental**: Constrói perfil baseado em interações históricas

### 🔐 Privacidade e Compliance
- **LGPD/GDPR compliant**: Respeita direitos de privacidade dos usuários
- **Limpeza automática**: Remove dados antigos automaticamente
- **Configurações por usuário**: Cada usuário pode controlar seus dados
- **Exportação de dados**: Permite download completo dos dados pessoais
- **Direito ao esquecimento**: Remoção completa de dados sob demanda

## 🗄️ Estrutura do Banco SQLite

### Tabelas Principais

#### `users` - Perfis de Usuários
```sql
- user_id: ID único do Discord
- username: Nome de usuário atual
- display_name: Nome de exibição
- message_count: Total de mensagens enviadas  
- personality_traits: Traços de personalidade (JSON)
- interests: Tópicos de interesse (JSON)
- communication_style: Estilo de comunicação detectado
```

#### `messages` - Histórico de Mensagens
```sql
- message_id: ID único da mensagem
- user_id: Referência ao usuário
- content: Conteúdo sanitizado da mensagem
- sentiment_score: Score de sentimento (-1 a 1)
- emotion_category: Categoria emocional detectada
- timestamp: Quando a mensagem foi enviada
```

#### `topics` - Análise de Tópicos
```sql
- keyword: Palavra-chave identificada
- user_id: Usuário que mencionou o tópico
- frequency: Quantas vezes foi mencionado
- last_mentioned: Última vez que foi mencionado
```

#### `privacy_settings` - Configurações de Privacidade
```sql
- user_id: ID do usuário
- data_collection_enabled: Se permite coleta de dados
- context_sharing_enabled: Se permite usar dados para contexto de IA
- auto_delete_days: Quantos dias manter os dados
```

## 🚀 Como Usar

### Integração Automática
O módulo é automaticamente inicializado com o bot e coleta mensagens em tempo real.

### Contexto para IA
```javascript
// O contexto é automaticamente adicionado aos prompts da IA
const context = await socialModule.getConversationContext(userId, guildId, 10);
const enrichedPrompt = contextAPI.formatForAIPrompt(context);
```

### Configurações de Privacidade
Os usuários podem controlar seus dados através de comandos específicos (a serem implementados):
- `m.privacy status` - Ver configurações atuais
- `m.privacy disable` - Desabilitar coleta de dados  
- `m.privacy export` - Exportar todos os dados pessoais
- `m.privacy delete` - Remover todos os dados (irreversível)

## 📈 Benefícios para a IA

### Respostas Mais Personalizadas
- **Memória conversacional**: A IA lembra de conversas anteriores
- **Adaptação ao usuário**: Ajusta tom e estilo baseado no perfil do usuário
- **Contexto relevante**: Usa histórico para dar respostas mais pertinentes
- **Continuidade**: Mantém coerência entre múltiplas interações

### Exemplos de Melhorias

**Antes (sem contexto):**
```
Usuário: "Como vai aquele projeto?"
IA: "Desculpe, não sei sobre que projeto você está falando."
```

**Depois (com contexto social):**
```
Usuário: "Como vai aquele projeto?"
IA: "Ah, você deve estar se referindo ao projeto de bot que você mencionou na semana passada! Como está o progresso?"
```

## 🔧 Configuração Técnica

### Banco de Dados
- **SQLite local**: Arquivo `social_module/data/social.db`
- **Performance otimizada**: Índices e prepared statements
- **WAL mode**: Para melhor concorrência
- **Backup automático**: Sistema de backup planejado

### Limpeza Automática
- **Execução**: A cada 6 horas
- **Configurável**: Por usuário, padrão 30 dias
- **Inteligente**: Remove apenas dados antigos, mantém perfis ativos

### Segurança e Privacidade
- **Sanitização**: Remove links, mentions sensitivos
- **Anonimização**: Dados podem ser anonimizados se necessário
- **Criptografia**: Planejada para dados sensíveis
- **Auditoria**: Logs de acesso e modificações

## 🎉 Próximos Passos

1. **Comandos de Privacidade**: Interface para usuários gerenciarem seus dados
2. **Analytics Dashboard**: Painel para administradores verem estatísticas
3. **ML Avançado**: Análise mais sofisticada de sentimentos e tópicos
4. **Backup na Nuvem**: Sistema de backup opcional
5. **API Externa**: Endpoint para integração com outros serviços

---

**⚠️ Importante**: Este módulo respeita totalmente a privacidade dos usuários e está em conformidade com LGPD e GDPR. Os usuários têm controle total sobre seus dados.
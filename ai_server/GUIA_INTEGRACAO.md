# 🤖 Guia de Integração AI - MaryBot

## Como funciona a integração

O MaryBot agora responde automaticamente quando é mencionado em qualquer canal onde ele tem permissão para enviar mensagens.

### 📝 Exemplos de uso:

1. **Menção simples:**
```
@MaryBot Olá! Como você está?
```

2. **Perguntas:**
```
@MaryBot Qual é o sentido da vida?
@MaryBot Me conte uma piada
@MaryBot Como está o tempo hoje?
```

3. **Conversação:**
```
@MaryBot Estou triste hoje
@MaryBot Preciso de conselhos sobre estudos
@MaryBot O que você acha de animes?
```

## 🔧 Funcionalidades

### ✅ O que funciona:
- ✅ Detecção automática de menções
- ✅ Remoção da menção do texto antes de processar
- ✅ Conexão com o servidor AI local (porta 3001)
- ✅ Respostas em embed formatado
- ✅ Indicador de "digitando" enquanto processa
- ✅ Fallback quando AI não está disponível
- ✅ Log de todas as conversas
- ✅ Mensagem de help quando mencionado sem texto

### 🛡️ Proteções implementadas:
- ⚠️ Ignora mensagens de outros bots
- ⚠️ Tratamento de erros com mensagens amigáveis
- ⚠️ Fallback para quando o servidor AI está offline
- ⚠️ Rate limiting através do servidor AI

## 🎨 Formato das respostas

As respostas da AI são enviadas em embeds com:
- **Autor**: MaryBot AI + avatar do bot
- **Descrição**: Resposta da AI
- **Footer**: "Em resposta a [usuário]" + avatar do usuário
- **Timestamp**: Hora da resposta
- **Cor**: Azul Discord (#7289DA)

## 🚀 Testando a integração

### 1. **Certifique-se de que o servidor AI está rodando:**
```bash
cd ai_server
node server.js
```

### 2. **No Discord, mencione o bot:**
```
@MaryBot Oi! Você está funcionando?
```

### 3. **Teste diferentes tipos de mensagem:**
```
@MaryBot           # Sem texto - mostra mensagem de ajuda
@MaryBot Olá       # Conversação simples
@MaryBot Como você está se sentindo hoje?  # Pergunta
```

## 🔍 Logs e Debug

Todas as interações são logadas com:
- Usuário que fez a menção
- Servidor (guild) onde aconteceu
- Prompt enviado (primeiros 50 chars)
- Resposta gerada (primeiros 50 chars)

### Exemplo de log:
```
[AI_Mention] user: João, guild: Meu Servidor, prompt: "Olá! Como você está?", response: "Olá! É um prazer conversar com você!"
```

## ⚙️ Configurações

### Servidor AI (ai_server/.env):
```env
AI_SERVER_PORT=3001
GPT2_MAX_LENGTH=200
GPT2_TEMPERATURE=0.8
```

### Parâmetros da requisição:
- **maxLength**: 200 caracteres (máximo da resposta)
- **temperature**: 0.8 (criatividade da AI)

## 🔧 Troubleshooting

### Problema: Bot não responde a menções
**Soluções:**
1. Verificar se o servidor AI está rodando na porta 3001
2. Verificar logs do bot para erros
3. Testar o servidor AI diretamente: `curl http://localhost:3001/api/health`

### Problema: Respostas estranhas ou inadequadas
**Soluções:**
1. Ajustar o parâmetro `temperature` no código (menor = mais conservador)
2. Verificar se o modelo local está funcionando corretamente
3. Adicionar chave do Hugging Face no .env para usar API externa

### Problema: Demora para responder
**Soluções:**
1. Verificar conexão com o servidor AI
2. Reduzir `maxLength` para respostas mais rápidas
3. Monitorar logs do servidor AI para erros

## 📝 Exemplos de teste

### Teste básico:
```
Usuário: @MaryBot Oi!
MaryBot: Olá! Como posso ajudá-lo hoje?
```

### Teste com contexto:
```
Usuário: @MaryBot Estou aprendendo programação
MaryBot: Que ótimo! Programação é uma habilidade muito valiosa. Continue praticando!
```

### Teste sem texto:
```
Usuário: @MaryBot
MaryBot: [Embed de ajuda explicando como usar]
```

## 🎯 Próximos passos

Para melhorar ainda mais a integração:

1. **Memória de conversação**: Lembrar de conversas anteriores
2. **Análise de sentimento**: Adaptar respostas baseado no humor
3. **Comandos especiais**: Permitir comandos mistos (`@MaryBot !help`)
4. **Personalização por servidor**: Diferentes personalidades por guild
5. **Rate limiting**: Evitar spam de menções

---

**🚀 A integração está pronta e funcionando!** 

Teste mencionando o bot em qualquer canal e veja a magia acontecer!
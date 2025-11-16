# MaryBot AI Server

Servidor de Inteligência Artificial para o MaryBot usando modelos do Hugging Face, especialmente GPT-2.

## 🚀 Características

- **Geração de Texto**: Usando GPT-2 para conversação natural
- **Análise de Sentimento**: Detecta emoções e sentimentos em textos
- **Múltiplas Rotas de API**: Endpoints organizados para diferentes funcionalidades
- **Rate Limiting**: Proteção contra spam e uso excessivo
- **Logging Avançado**: Sistema completo de logs com Winston
- **Health Checks**: Monitoramento da saúde do servidor e modelo
- **Testes Automatizados**: Suite de testes para validação

## 📋 Pré-requisitos

- Node.js 18+ 
- Git com Git LFS (para clonar modelos)
- Chave API do Hugging Face (opcional, mas recomendado)

## ⚙️ Instalação

1. **Instalar dependências:**
```bash
cd ai_server
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

3. **Clonar modelos do Hugging Face:**
```bash
npm run clone-models
```

4. **Iniciar servidor:**
```bash
npm start
# ou para desenvolvimento:
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
AI_SERVER_PORT=3001

# Hugging Face
HUGGINGFACE_API_KEY=sua_chave_aqui

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Modelo GPT-2
GPT2_MAX_LENGTH=512
GPT2_TEMPERATURE=0.7
GPT2_TOP_P=0.9

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/ai_server.log
```

## 📚 API Endpoints

### Health Check
```http
GET /api/health
```

### Conversação
```http
POST /api/conversation/simple
Content-Type: application/json

{
  "prompt": "Olá, como você está?",
  "options": {
    "maxLength": 200,
    "temperature": 0.8
  }
}
```

```http
POST /api/conversation/generate
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Oi!" },
    { "role": "assistant", "content": "Olá! Como posso ajudar?" },
    { "role": "user", "content": "Me conte uma piada" }
  ]
}
```

### Análise de Texto
```http
POST /api/analysis/sentiment
Content-Type: application/json

{
  "text": "Estou muito feliz hoje!"
}
```

```http
POST /api/analysis/complete
Content-Type: application/json

{
  "text": "Este filme é incrível, adorei cada momento!"
}
```

### Geração de Conteúdo
```http
POST /api/generation/text
Content-Type: application/json

{
  "prompt": "Era uma vez",
  "maxLength": 300,
  "temperature": 0.8
}
```

```http
POST /api/generation/story
Content-Type: application/json

{
  "theme": "aventura espacial",
  "characters": ["capitão", "robô"],
  "setting": "nave espacial",
  "length": "short"
}
```

## 🧪 Testes

Executar todos os testes:
```bash
npm test
```

Testar endpoints específicos:
```bash
node test/testServer.js
```

## 📝 Estrutura do Projeto

```
ai_server/
├── server.js              # Servidor principal
├── package.json           # Dependências e scripts
├── .env.example          # Exemplo de configuração
├── cloneModelsScript.js  # Script para baixar modelos
├── routes/               # Rotas da API
│   ├── health.js         # Health checks
│   ├── conversation.js   # Endpoints de conversação
│   ├── analysis.js       # Análise de texto
│   └── generation.js     # Geração de conteúdo
├── services/             # Lógica de negócio
│   └── gpt2Service.js    # Serviço GPT-2
├── utils/                # Utilitários
│   ├── logger.js         # Sistema de logs
│   └── rateLimit.js      # Rate limiting
├── test/                 # Testes
│   └── testServer.js     # Testes automatizados
├── logs/                 # Arquivos de log
└── gpt2/                 # Modelo GPT-2 (criado após clone)
```

## 🔗 Integração com o MaryBot

Para integrar com seu bot Discord:

```javascript
// No seu bot Discord
import fetch from 'node-fetch';

const AI_SERVER_URL = 'http://localhost:3001';

async function getAIResponse(userMessage) {
  try {
    const response = await fetch(`${AI_SERVER_URL}/api/conversation/simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userMessage,
        options: {
          maxLength: 200,
          temperature: 0.7
        }
      })
    });
    
    const data = await response.json();
    return data.data.response;
    
  } catch (error) {
    console.error('Erro ao obter resposta da AI:', error);
    return 'Desculpe, não consegui processar sua mensagem.';
  }
}

// Usar em comandos do bot
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!ai ')) {
    const prompt = message.content.substring(4);
    const response = await getAIResponse(prompt);
    message.reply(response);
  }
});
```

## 📊 Monitoramento

O servidor inclui endpoints de monitoramento:

- `/api/health` - Status geral do servidor
- `/api/health/model` - Informações do modelo
- `/api/health/metrics` - Métricas de sistema
- `/api/health/test` - Teste rápido do modelo

## 🛠️ Desenvolvimento

Para desenvolvimento:
```bash
npm run dev  # Inicia com auto-reload
```

Para debugar:
```bash
DEBUG=* npm run dev
```

## 📄 Licença

MIT License - Veja arquivo LICENSE para detalhes.

## 🤝 Contribuindo

1. Fork do projeto
2. Crie sua feature branch
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 🐛 Problemas Conhecidos

- **Rate Limiting**: Configure adequadamente para seu uso
- **Memória**: Modelos grandes podem consumir bastante RAM
- **API Keys**: Sem chave do Hugging Face, algumas funcionalidades são limitadas

## 📞 Suporte

Para problemas e sugestões, abra uma issue no repositório.
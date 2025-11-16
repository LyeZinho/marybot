// Exemplo de integração do AI Server com o MaryBot Discord
import fetch from 'node-fetch';

class MaryBotAI {
  constructor(aiServerUrl = 'http://localhost:3001') {
    this.aiServerUrl = aiServerUrl;
    this.isHealthy = false;
    this.checkHealth();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.aiServerUrl}/api/health`);
      const health = await response.json();
      this.isHealthy = health.status === 'healthy';
      console.log(`🤖 AI Server: ${this.isHealthy ? 'Online' : 'Offline'}`);
      return this.isHealthy;
    } catch (error) {
      console.log('⚠️ AI Server indisponível:', error.message);
      this.isHealthy = false;
      return false;
    }
  }

  async generateResponse(userMessage, options = {}) {
    if (!this.isHealthy && !await this.checkHealth()) {
      return 'Desculpe, minha IA está temporariamente indisponível.';
    }

    try {
      const response = await fetch(`${this.aiServerUrl}/api/conversation/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          options: {
            maxLength: options.maxLength || 200,
            temperature: options.temperature || 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data.response : 'Não consegui processar sua mensagem.';

    } catch (error) {
      console.error('Erro na geração de resposta:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
    }
  }

  async analyzeSentiment(text) {
    if (!this.isHealthy) return null;

    try {
      const response = await fetch(`${this.aiServerUrl}/api/analysis/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      return data.success ? data.data.topResult : null;

    } catch (error) {
      console.error('Erro na análise de sentimento:', error);
      return null;
    }
  }

  async generateStory(theme, characters = [], setting = '') {
    if (!this.isHealthy) return null;

    try {
      const response = await fetch(`${this.aiServerUrl}/api/generation/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          characters,
          setting,
          length: 'short'
        })
      });

      const data = await response.json();
      return data.success ? data.data.story : null;

    } catch (error) {
      console.error('Erro na geração de história:', error);
      return null;
    }
  }

  async processConversation(messages, options = {}) {
    if (!this.isHealthy) return null;

    try {
      const response = await fetch(`${this.aiServerUrl}/api/conversation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          options
        })
      });

      const data = await response.json();
      return data.success ? data.data.generatedText : null;

    } catch (error) {
      console.error('Erro na conversação:', error);
      return null;
    }
  }
}

// Exemplo de uso com Discord.js
export function setupAICommands(client) {
  const ai = new MaryBotAI();

  // Comando de conversação
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comando !ai <mensagem>
    if (message.content.startsWith('!ai ')) {
      const userMessage = message.content.substring(4);
      const response = await ai.generateResponse(userMessage);
      message.reply(response);
    }

    // Comando !sentiment <texto>
    else if (message.content.startsWith('!sentiment ')) {
      const text = message.content.substring(11);
      const sentiment = await ai.analyzeSentiment(text);
      
      if (sentiment) {
        const emoji = sentiment.label === 'POSITIVE' ? '😊' : 
                     sentiment.label === 'NEGATIVE' ? '😔' : '😐';
        message.reply(`${emoji} Sentimento detectado: **${sentiment.label}** (${Math.round(sentiment.score * 100)}%)`);
      } else {
        message.reply('Não consegui analisar o sentimento do texto.');
      }
    }

    // Comando !story <tema>
    else if (message.content.startsWith('!story ')) {
      const theme = message.content.substring(7);
      const story = await ai.generateStory(theme, [], 'um lugar mágico');
      
      if (story) {
        message.reply(`📚 **História: ${theme}**\n\n${story}`);
      } else {
        message.reply('Não consegui gerar uma história no momento.');
      }
    }
  });

  // Sistema de conversação contextual
  const conversationHistory = new Map();

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!chat ')) return;

    const userId = message.author.id;
    const userMessage = message.content.substring(6);

    // Recuperar histórico da conversa
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }

    const history = conversationHistory.get(userId);
    
    // Adicionar mensagem do usuário ao histórico
    history.push({ role: 'user', content: userMessage });
    
    // Manter apenas as últimas 10 mensagens para não sobrecarregar
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    // Gerar resposta contextual
    const response = await ai.processConversation(history);
    
    if (response) {
      // Adicionar resposta ao histórico
      history.push({ role: 'assistant', content: response });
      message.reply(response);
    } else {
      message.reply('Desculpe, não consegui processar sua mensagem no momento.');
    }

    // Atualizar histórico
    conversationHistory.set(userId, history);
  });
}

export default MaryBotAI;
/**
 * 🤖 Serviço de Conversa por Voz com IA
 * Integra STT + IA + TTS para conversação natural
 */

import { logger } from './logger.js';
import { externalLLMService } from './ExternalLLMService.js';
import { externalVoiceService } from './ExternalVoiceService.js';

class VoiceConversationService {
  constructor() {
    this.conversationHistory = new Map(); // userId -> history
    this.activeConversations = new Set(); // userId em conversa ativa
  }

  /**
   * 🧠 Processar conversa com IA LLM Externa
   */
  async processWithAI(userId, text, context = {}) {
    try {
      logger.info(`🧠 Processando com IA LLM: "${text}"`);

      // Obter histórico da conversa
      const history = this.conversationHistory.get(userId) || [];
      
      // Construir contexto para a API LLM
      let contextText = 'Você é MaryBot, um assistente de voz amigável para Discord. ';
      contextText += 'Responda de forma natural, breve e conversacional em português brasileiro. ';
      contextText += 'Esta é uma conversa por voz, então mantenha as respostas concisas.';
      
      // Adicionar histórico recente
      if (history.length > 0) {
        contextText += '\n\nHistórico da conversa:';
        history.slice(-3).forEach(msg => {
          const role = msg.role === 'user' ? 'Usuário' : 'Você';
          contextText += `\n${role}: ${msg.content}`;
        });
      }
      
      // Gerar resposta usando API LLM externa
      const aiResult = await externalLLMService.generateConversation({
        prompt: text,
        context: contextText,
        maxTokens: 100, // Mais conciso para voz
        userId: userId
      });
      
      if (aiResult.response && aiResult.response.trim()) {
        // Atualizar histórico
        this.updateConversationHistory(userId, text, aiResult.response);
        
        logger.success(`✅ IA LLM respondeu: "${aiResult.response.substring(0, 50)}..."`);
        return {
          success: true,
          response: aiResult.response,
          confidence: 0.9,
          source: 'external_llm'
        };
      }

      throw new Error('API LLM não gerou resposta válida');

    } catch (error) {
      logger.warn(`⚠️ Erro na IA: ${error.message}`);
      return null;
    }
  }

  /**
   * 💫 Gerar resposta contextual inteligente
   */
  async generateContextualResponse(userId, text, guildInfo = {}) {
    try {
      // Tentar processar com IA primeiro
      const aiResponse = await this.processWithAI(userId, text, guildInfo);
      if (aiResponse && aiResponse.success) {
        return aiResponse;
      }

      // Fallback para respostas programadas mais inteligentes
      return this.generateSmartFallbackResponse(userId, text);

    } catch (error) {
      logger.error('❌ Erro na geração de resposta contextual:', error);
      return this.generateBasicResponse(text);
    }
  }

  /**
   * 🧩 Resposta fallback inteligente
   */
  generateSmartFallbackResponse(userId, text) {
    const lowerText = text.toLowerCase();
    
    // Análise de sentimento básica
    const sentiment = this.analyzeSentiment(text);
    
    // Respostas baseadas em sentimento
    if (sentiment === 'positive') {
      const positiveResponses = [
        'Que legal! Fico feliz em saber disso!',
        'Adorei ouvir isso! Você parece animado!',
        'Que ótimo! Me conte mais sobre isso!'
      ];
      return {
        success: true,
        response: positiveResponses[Math.floor(Math.random() * positiveResponses.length)],
        confidence: 0.7,
        source: 'sentiment-positive'
      };
    }
    
    if (sentiment === 'negative') {
      const supportiveResponses = [
        'Sinto muito por isso. Quer conversar sobre o que está acontecendo?',
        'Parece que você não está se sentindo muito bem. Como posso te ajudar?',
        'Às vezes as coisas podem ser difíceis. Estou aqui se precisar de alguém para conversar.'
      ];
      return {
        success: true,
        response: supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)],
        confidence: 0.7,
        source: 'sentiment-negative'
      };
    }

    // Respostas por categorias de interesse
    if (lowerText.includes('jogo') || lowerText.includes('game')) {
      return {
        success: true,
        response: 'Você gosta de jogos? Eu posso te ajudar com vários jogos aqui no servidor! Quer que eu te mostre?',
        confidence: 0.8,
        source: 'topic-games'
      };
    }

    if (lowerText.includes('música') || lowerText.includes('music')) {
      return {
        success: true,
        response: 'Música é incrível! Eu adoraria poder ouvir música também. Qual é seu estilo favorito?',
        confidence: 0.8,
        source: 'topic-music'
      };
    }

    // Resposta padrão mais inteligente
    return {
      success: true,
      response: 'Interessante! Me conte mais sobre isso. Adoro conversar!',
      confidence: 0.5,
      source: 'fallback-smart'
    };
  }

  /**
   * 📊 Análise de sentimento básica
   */
  analyzeSentiment(text) {
    const positiveWords = ['feliz', 'ótimo', 'legal', 'bom', 'incrível', 'adorei', 'perfeito'];
    const negativeWords = ['triste', 'ruim', 'chato', 'difícil', 'problema', 'erro', 'odiar'];
    
    const lowerText = text.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * 🔄 Atualizar histórico de conversa
   */
  updateConversationHistory(userId, userMessage, botResponse) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    
    const history = this.conversationHistory.get(userId);
    
    // Adicionar mensagens com timestamp
    history.push({
      type: 'user',
      message: userMessage,
      timestamp: Date.now()
    });
    
    history.push({
      type: 'bot',
      message: botResponse,
      timestamp: Date.now()
    });
    
    // Manter apenas últimas 20 mensagens
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  /**
   * 🧼 Limpar histórico expirado
   */
  cleanExpiredHistory() {
    const expiredTime = Date.now() - (30 * 60 * 1000); // 30 minutos
    
    for (const [userId, history] of this.conversationHistory.entries()) {
      const validHistory = history.filter(msg => msg.timestamp > expiredTime);
      
      if (validHistory.length === 0) {
        this.conversationHistory.delete(userId);
      } else {
        this.conversationHistory.set(userId, validHistory);
      }
    }
  }

  /**
   * 📈 Status do serviço
   */
  getStatus() {
    return {
      activeConversations: this.activeConversations.size,
      totalUsers: this.conversationHistory.size,
      aiServerUrl: this.aiServerUrl
    };
  }

  /**
   * 🧠 Resposta básica de emergência
   */
  generateBasicResponse(text) {
    return {
      success: true,
      response: 'Desculpe, estou com um pouco de dificuldade para processar isso agora. Pode repetir de outra forma?',
      confidence: 0.3,
      source: 'basic-fallback'
    };
  }
}

// Instância singleton
export const voiceConversationService = new VoiceConversationService();

export { VoiceConversationService };
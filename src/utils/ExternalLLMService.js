/**
 * 🤖 Serviço de API LLM Externa (TinyLlama)
 * Integração com API LLM hospedada no servidor homelab.op:10650
 */

import { logger } from './logger.js';

class ExternalLLMService {
  constructor() {
    this.apiUrl = process.env.LLM_API_URL || 'http://homelab.op:10650/v1/chat/completions';
    this.defaultMaxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 150;
    this.timeout = parseInt(process.env.LLM_TIMEOUT) || 30000; // 30 segundos

    logger.info(`🤖 Serviço LLM configurado: ${this.apiUrl}`);
  }

  /**
   * 💬 Gerar resposta de conversação
   */
  async generateConversation(options = {}) {
    try {
      const {
        prompt = '',
        context = '',
        maxTokens = this.defaultMaxTokens,
        temperature = 0.7,
        userId = null
      } = options;

      // Construir mensagens no formato Chat API
      const messages = [];
      
      // Adicionar contexto como system message se fornecido
      if (context && context.trim()) {
        messages.push({
          role: 'system',
          content: context.trim()
        });
      }

      // Adicionar prompt do usuário
      messages.push({
        role: 'user',
        content: prompt.trim()
      });

      const requestData = {
        model: 'tinyllama_tinyllama-1.1b-chat-v1.0',
        messages,
        max_tokens: maxTokens
      };

      logger.info(`🤖 Gerando resposta LLM para: "${prompt.substring(0, 50)}..."`);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`API LLM retornou ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.choices || !data.choices[0]) {
        throw new Error('Formato de resposta inválido da API LLM');
      }

      let generatedText = data.choices[0].message.content;
      
      // Limpar tokens de template do TinyLlama
      generatedText = this.cleanLLMResponse(generatedText);

      const result = {
        content: generatedText,
        response: generatedText, // Manter compatibilidade
        tokenCount: data.usage?.completion_tokens || generatedText.split(' ').length,
        tokens: data.usage?.completion_tokens || generatedText.split(' ').length,
        source: 'external_llm',
        model: 'tinyllama',
        userId: userId || 'unknown',
        timestamp: new Date().toISOString()
      };

      logger.success(`✅ Resposta LLM gerada: ${result.tokens} tokens`);
      return result;

    } catch (error) {
      logger.error('❌ Erro ao gerar resposta LLM:', error.message);
      
      // Fallback para resposta de erro
      return {
        content: 'Desculpe, não consegui processar sua solicitação no momento.',
        response: 'Desculpe, não consegui processar sua solicitação no momento.',
        error: error.message,
        tokenCount: 0,
        tokens: 0,
        source: 'external_llm',
        model: 'tinyllama',
        userId: userId || 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 📝 Gerar texto livre
   */
  async generateText(options = {}) {
    const {
      prompt,
      maxTokens = this.defaultMaxTokens,
      context = ''
    } = options;

    return await this.generateConversation({
      prompt,
      context,
      maxTokens,
      ...options
    });
  }

  /**
   * 🎭 Análise de sentimento
   */
  async analyzeSentiment(text) {
    try {
      const prompt = `Analise o sentimento do seguinte texto e responda apenas com: "positivo", "negativo" ou "neutro".

Texto: "${text}"

Sentimento:`;

      const result = await this.generateConversation({
        prompt,
        maxTokens: 10,
        context: 'Você é um analisador de sentimentos. Responda apenas com uma palavra: positivo, negativo ou neutro.'
      });

      const sentiment = result.response.toLowerCase().trim();
      
      // Mapear resposta para formato esperado
      let mappedSentiment = 'neutral';
      if (sentiment.includes('positivo')) mappedSentiment = 'positive';
      else if (sentiment.includes('negativo')) mappedSentiment = 'negative';

      return {
        sentiment: mappedSentiment,
        confidence: 0.8, // Confiança simulada
        source: 'external_llm'
      };

    } catch (error) {
      logger.error('❌ Erro na análise de sentimento:', error.message);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        source: 'external_llm',
        error: error.message
      };
    }
  }

  /**
   * 😊 Análise de emoção
   */
  async analyzeEmotion(text) {
    try {
      const prompt = `Identifique a emoção principal no seguinte texto. Responda apenas com uma das opções: alegria, tristeza, raiva, medo, surpresa, nojo, neutro.

Texto: "${text}"

Emoção:`;

      const result = await this.generateConversation({
        prompt,
        maxTokens: 10,
        context: 'Você é um analisador de emoções. Responda apenas com uma palavra da lista fornecida.'
      });

      const emotion = result.response.toLowerCase().trim();
      
      // Mapear para emoções padrão
      const emotions = ['alegria', 'tristeza', 'raiva', 'medo', 'surpresa', 'nojo', 'neutro'];
      const detectedEmotion = emotions.find(e => emotion.includes(e)) || 'neutro';

      return {
        emotion: detectedEmotion,
        confidence: 0.8,
        source: 'external_llm'
      };

    } catch (error) {
      logger.error('❌ Erro na análise de emoção:', error.message);
      return {
        emotion: 'neutro',
        confidence: 0.5,
        source: 'external_llm',
        error: error.message
      };
    }
  }

  /**
   * 🧹 Limpar resposta do LLM (remover tokens de template)
   */
  cleanLLMResponse(text) {
    if (!text) return '';
    
    return text
      .replace(/<\|user\|>/g, '')
      .replace(/<\|assistant\|>/g, '')
      .replace(/<\|system\|>/g, '')
      .trim();
  }

  /**
   * 🔍 Testar conectividade da API
   */
  async testConnection() {
    try {
      const testResult = await this.generateConversation({
        prompt: 'Olá',
        maxTokens: 10,
        userId: 'test-connection'
      });
      
      return {
        connected: true,
        response: testResult.response,
        latency: Date.now() - Date.now() // Placeholder
      };
      
    } catch (error) {
      logger.error('❌ Teste de conexão LLM falhou:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * 📊 Obter status do serviço
   */
  getStatus() {
    return {
      service: 'external_llm',
      apiUrl: this.apiUrl,
      maxTokens: this.defaultMaxTokens,
      timeout: this.timeout,
      model: 'tinyllama'
    };
  }
}

// Instância singleton
const externalLLMService = new ExternalLLMService();

export { externalLLMService, ExternalLLMService };
export default externalLLMService;
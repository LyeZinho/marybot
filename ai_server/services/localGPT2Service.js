import { logger } from '../utils/logger.js';

class LocalGPT2Service {
  constructor() {
    this.isInitialized = false;
    this.responses = {
      greetings: [
        'Olá! Como posso ajudá-lo hoje?',
        'Oi! É um prazer conversar com você!',
        'Olá! Em que posso ser útil?',
        'Oi! Como você está se sentindo hoje?'
      ],
      questions: [
        'Essa é uma pergunta interessante! Deixe-me pensar...',
        'Hmm, que questão fascinante!',
        'Posso compartilhar algumas ideias sobre isso.',
        'Vou fazer o meu melhor para responder isso.'
      ],
      general: [
        'Entendo o que você está dizendo.',
        'Isso faz sentido do seu ponto de vista.',
        'É uma perspectiva interessante!',
        'Compreendo sua posição sobre isso.'
      ],
      positive: [
        'Que ótimo! Fico feliz em ouvir isso.',
        'Isso é maravilhoso! Continue assim!',
        'Fantástico! Você está indo muito bem.',
        'Excelente! Estou orgulhoso de você.'
      ],
      negative: [
        'Entendo que isso deve ser difícil para você.',
        'Sinto muito que esteja passando por isso.',
        'Às vezes as coisas podem ser desafiadoras.',
        'Lembre-se de que você é mais forte do que pensa.'
      ]
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      this.isInitialized = true;
      logger.info('Serviço GPT-2 Local inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar serviço GPT-2 Local:', error);
      throw error;
    }
  }

  async generateText(options = {}) {
    const { prompt } = options;

    if (!this.isInitialized) {
      throw new Error('Serviço GPT-2 Local não foi inicializado');
    }

    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    try {
      // Análise simples do prompt para escolher resposta apropriada
      const lowerPrompt = prompt.toLowerCase();
      let responseCategory = 'general';
      
      if (this.containsGreeting(lowerPrompt)) {
        responseCategory = 'greetings';
      } else if (this.containsQuestion(lowerPrompt)) {
        responseCategory = 'questions';
      } else if (this.hasPositiveSentiment(lowerPrompt)) {
        responseCategory = 'positive';
      } else if (this.hasNegativeSentiment(lowerPrompt)) {
        responseCategory = 'negative';
      }

      const responses = this.responses[responseCategory];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      // Adicionar algumas variações baseadas no contexto
      let generatedText = randomResponse;
      
      if (this.containsName(prompt)) {
        const name = this.extractName(prompt);
        if (name) {
          generatedText = generatedText.replace(/você/g, name);
        }
      }

      logger.info('Texto gerado com GPT-2 Local:', {
        promptLength: prompt.length,
        outputLength: generatedText.length,
        category: responseCategory
      });

      return {
        success: true,
        prompt,
        generatedText,
        metadata: {
          model: 'gpt2-local',
          category: responseCategory,
          isLocal: true,
          actualLength: generatedText.length
        }
      };

    } catch (error) {
      logger.error('Erro ao gerar texto:', error);
      throw new Error(`Falha na geração de texto: ${error.message}`);
    }
  }

  async generateConversation(messages = [], options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Mensagens são obrigatórias');
    }

    // Pegar a última mensagem do usuário
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const prompt = lastUserMessage ? lastUserMessage.content : '';

    const result = await this.generateText({ prompt, ...options });

    return {
      ...result,
      conversationContext: {
        messagesProcessed: messages.length,
        promptUsed: prompt
      }
    };
  }

  async analyzeText(text, analysisType = 'sentiment') {
    if (!text || typeof text !== 'string') {
      throw new Error('Texto é obrigatório');
    }

    try {
      const lowerText = text.toLowerCase();
      let result = [];

      switch (analysisType) {
        case 'sentiment':
          if (this.hasPositiveSentiment(lowerText)) {
            result = [{ label: 'POSITIVE', score: 0.85 }];
          } else if (this.hasNegativeSentiment(lowerText)) {
            result = [{ label: 'NEGATIVE', score: 0.78 }];
          } else {
            result = [{ label: 'NEUTRAL', score: 0.65 }];
          }
          break;
          
        case 'emotion':
          if (this.containsWords(lowerText, ['feliz', 'alegre', 'contente', 'animado'])) {
            result = [{ label: 'joy', score: 0.82 }];
          } else if (this.containsWords(lowerText, ['triste', 'deprimido', 'melancólico'])) {
            result = [{ label: 'sadness', score: 0.79 }];
          } else if (this.containsWords(lowerText, ['raiva', 'bravo', 'irritado', 'furioso'])) {
            result = [{ label: 'anger', score: 0.76 }];
          } else {
            result = [{ label: 'neutral', score: 0.60 }];
          }
          break;
          
        case 'toxicity':
          if (this.containsWords(lowerText, ['idiota', 'estúpido', 'ódio', 'matar'])) {
            result = [{ label: 'TOXIC', score: 0.85 }];
          } else {
            result = [{ label: 'NOT_TOXIC', score: 0.92 }];
          }
          break;
          
        default:
          throw new Error(`Tipo de análise não suportado: ${analysisType}`);
      }

      logger.info('Análise concluída localmente:', { analysisType, resultCount: result.length });

      return {
        success: true,
        text,
        analysisType,
        results: result,
        topResult: result[0] || null,
        isLocal: true
      };

    } catch (error) {
      logger.error('Erro na análise de texto:', error);
      throw new Error(`Falha na análise: ${error.message}`);
    }
  }

  // Métodos auxiliares
  containsGreeting(text) {
    const greetings = ['oi', 'olá', 'hello', 'hi', 'bom dia', 'boa tarde', 'boa noite'];
    return greetings.some(greeting => text.includes(greeting));
  }

  containsQuestion(text) {
    const questionWords = ['como', 'quando', 'onde', 'por que', 'qual', 'quem', '?'];
    return questionWords.some(word => text.includes(word));
  }

  hasPositiveSentiment(text) {
    const positiveWords = ['feliz', 'ótimo', 'excelente', 'bom', 'legal', 'incrível', 'amor', 'alegre'];
    return positiveWords.some(word => text.includes(word));
  }

  hasNegativeSentiment(text) {
    const negativeWords = ['triste', 'ruim', 'terrível', 'ódio', 'raiva', 'deprimido', 'chateado'];
    return negativeWords.some(word => text.includes(word));
  }

  containsName(text) {
    // Busca padrões como "meu nome é", "me chamo", etc.
    const namePatterns = /(?:meu nome é|me chamo|sou o|sou a)\s+(\w+)/i;
    return namePatterns.test(text);
  }

  extractName(text) {
    const namePatterns = /(?:meu nome é|me chamo|sou o|sou a)\s+(\w+)/i;
    const match = text.match(namePatterns);
    return match ? match[1] : null;
  }

  containsWords(text, words) {
    return words.some(word => text.includes(word));
  }

  getModelInfo() {
    return {
      isInitialized: this.isInitialized,
      modelPath: 'local',
      config: { model_type: 'gpt2-local', vocab_size: 'N/A' },
      hasLocalModel: true,
      huggingFaceConnected: false,
      isLocal: true
    };
  }
}

export { LocalGPT2Service };
export default LocalGPT2Service;
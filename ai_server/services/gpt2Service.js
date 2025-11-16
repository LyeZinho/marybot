import { HfInference } from '@huggingface/inference';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';
import { LocalGPT2Service } from './localGPT2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GPT2Service {
  constructor() {
    this.hf = process.env.HUGGINGFACE_API_KEY ? 
      new HfInference(process.env.HUGGINGFACE_API_KEY, { 
        endpoint: 'https://router.huggingface.co/hf-inference' 
      }) : null;
    this.localService = new LocalGPT2Service();
    this.modelPath = join(dirname(__dirname), 'gpt2');
    this.isInitialized = false;
    this.config = null;
    this.useLocal = !process.env.HUGGINGFACE_API_KEY;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Verificar se o modelo existe localmente
      const configPath = join(this.modelPath, 'config.json');
      
      if (existsSync(configPath)) {
        this.config = JSON.parse(readFileSync(configPath, 'utf8'));
        logger.info('Configuração do GPT-2 carregada:', {
          modelType: this.config.model_type,
          vocabSize: this.config.vocab_size,
          maxPositionEmbeddings: this.config.max_position_embeddings
        });
      }
      
      this.isInitialized = true;
      logger.info('Serviço GPT-2 inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar serviço GPT-2:', error);
      throw error;
    }
  }

  async generateText(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Serviço GPT-2 não foi inicializado');
    }

    // Se não tem chave API ou é configurado para usar local, usar serviço local
    if (this.useLocal || !this.hf) {
      return await this.localService.generateText(options);
    }

    const {
      prompt,
      maxLength = parseInt(process.env.GPT2_MAX_LENGTH) || 512,
      temperature = parseFloat(process.env.GPT2_TEMPERATURE) || 0.7,
      topP = parseFloat(process.env.GPT2_TOP_P) || 0.9,
      doSample = true,
      numReturnSequences = 1
    } = options;

    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    try {
      logger.info('Gerando texto com GPT-2 (Hugging Face):', { 
        promptLength: prompt.length,
        maxLength,
        temperature,
        topP 
      });

      // Usar a API do Hugging Face para geração de texto
      const result = await this.hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: Math.min(maxLength, 1024),
          temperature,
          top_p: topP,
          do_sample: doSample,
          num_return_sequences: numReturnSequences,
          return_full_text: false,
          pad_token_id: 50256 // GPT-2 EOS token
        }
      });

      const generatedText = result.generated_text;

      logger.info('Texto gerado com sucesso:', {
        inputLength: prompt.length,
        outputLength: generatedText.length
      });

      return {
        success: true,
        prompt,
        generatedText,
        metadata: {
          model: 'gpt2',
          temperature,
          topP,
          maxLength,
          actualLength: generatedText.length,
          source: 'huggingface'
        }
      };

    } catch (error) {
      logger.warn('Erro ao usar Hugging Face, tentando serviço local:', error.message);
      return await this.localService.generateText(options);
    }
  }

  async generateConversation(messages = [], options = {}) {
    // Se usando serviço local ou sem chave API, delegar para o serviço local
    if (this.useLocal || !this.hf) {
      return await this.localService.generateConversation(messages, options);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Mensagens são obrigatórias');
    }

    try {
      // Converter mensagens para formato de prompt
      let prompt = '';
      messages.forEach((msg, index) => {
        const role = msg.role || 'user';
        const content = msg.content || msg.message || '';
        
        if (role === 'user') {
          prompt += `Usuário: ${content}\n`;
        } else if (role === 'assistant' || role === 'bot') {
          prompt += `MaryBot: ${content}\n`;
        } else {
          prompt += `${role}: ${content}\n`;
        }
      });

      prompt += 'MaryBot: ';

      const result = await this.generateText({
        prompt,
        maxLength: options.maxLength || 256,
        temperature: options.temperature || 0.8,
        topP: options.topP || 0.9,
        ...options
      });

      // Limpar a resposta
      let response = result.generatedText.trim();
      
      // Remover continuações indesejadas
      const stopSequences = ['\nUsuário:', '\nUser:', '\n---', '\n\n'];
      for (const stop of stopSequences) {
        const stopIndex = response.indexOf(stop);
        if (stopIndex !== -1) {
          response = response.substring(0, stopIndex);
        }
      }

      return {
        ...result,
        generatedText: response.trim(),
        conversationContext: {
          messagesProcessed: messages.length,
          promptUsed: prompt
        }
      };
    } catch (error) {
      logger.warn('Erro na conversação com Hugging Face, usando serviço local:', error.message);
      return await this.localService.generateConversation(messages, options);
    }
  }

  async analyzeText(text, analysisType = 'sentiment') {
    // Se usando serviço local ou sem chave API, usar análise local
    if (this.useLocal || !this.hf) {
      return await this.localService.analyzeText(text, analysisType);
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Texto é obrigatório');
    }

    try {
      logger.info('Analisando texto (Hugging Face):', { 
        textLength: text.length,
        analysisType 
      });

      let result = {};

      switch (analysisType) {
        case 'sentiment':
          result = await this.hf.textClassification({
            model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
            inputs: text
          });
          break;
          
        case 'emotion':
          result = await this.hf.textClassification({
            model: 'j-hartmann/emotion-english-distilroberta-base',
            inputs: text
          });
          break;
          
        case 'toxicity':
          result = await this.hf.textClassification({
            model: 'unitary/toxic-bert',
            inputs: text
          });
          break;
          
        default:
          throw new Error(`Tipo de análise não suportado: ${analysisType}`);
      }

      logger.info('Análise concluída:', { analysisType, resultCount: result.length });

      return {
        success: true,
        text,
        analysisType,
        results: result,
        topResult: result[0] || null,
        source: 'huggingface'
      };

    } catch (error) {
      logger.warn('Erro na análise com Hugging Face, usando análise local:', error.message);
      return await this.localService.analyzeText(text, analysisType);
    }
  }

  getModelInfo() {
    return {
      isInitialized: this.isInitialized,
      modelPath: this.modelPath,
      config: this.config,
      hasLocalModel: existsSync(this.modelPath),
      huggingFaceConnected: !!process.env.HUGGINGFACE_API_KEY,
      useLocal: this.useLocal,
      localServiceReady: this.localService?.isInitialized || false
    };
  }
}

// Singleton instance
let gpt2ServiceInstance = null;

export function getGPT2Service() {
  if (!gpt2ServiceInstance) {
    gpt2ServiceInstance = new GPT2Service();
  }
  return gpt2ServiceInstance;
}

export { GPT2Service };
export default getGPT2Service;
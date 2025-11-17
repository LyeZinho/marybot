import express from 'express';
import { getGPT2Service } from '../services/gpt2Service.js';
import { aiRateLimit } from '../utils/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const gpt2 = getGPT2Service();

// Middleware de rate limiting para rotas de conversação
router.use(aiRateLimit);

// Endpoint direto para conversação (compatibilidade)
router.post('/', async (req, res) => {
  try {
    const { 
      user_message, 
      history = [], 
      personality = 'friendly_female_assistant',
      language = 'pt-BR',
      guildId,
      guildName,
      channelType,
      userName 
    } = req.body;

    if (!user_message) {
      return res.status(400).json({
        error: true,
        message: 'Campo "user_message" é obrigatório'
      });
    }

    // Construir mensagens para o GPT-2
    const messages = [];
    
    // Adicionar histórico se existir
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.user) messages.push({ role: 'user', content: msg.user });
        if (msg.assistant) messages.push({ role: 'assistant', content: msg.assistant });
      });
    }
    
    // Adicionar mensagem atual
    messages.push({ role: 'user', content: user_message });

    const options = {
      personality,
      language,
      context: {
        guildId,
        guildName, 
        channelType,
        userName
      }
    };

    const result = await gpt2.generateConversation(messages, options);

    // Validar resposta gerada
    if (!result || !result.response || result.response.trim() === '') {
      logger.warn('⚠️ Resposta inválida gerada pela IA');
      return res.status(500).json({
        error: true,
        message: 'A IA não gerou uma resposta válida'
      });
    }

    res.json({
      success: true,
      response: result.response || result.text,
      confidence: result.confidence || 0.8
    });

  } catch (error) {
    logger.error('Erro na conversação direta:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Gerar resposta de conversação
router.post('/generate', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: true,
        message: 'Campo "messages" é obrigatório e deve ser um array'
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Pelo menos uma mensagem é necessária'
      });
    }

    const result = await gpt2.generateConversation(messages, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na geração de conversação:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Gerar resposta simples baseada em prompt
router.post('/simple', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "prompt" é obrigatório e deve ser uma string'
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        error: true,
        message: 'Prompt muito longo (máximo 2000 caracteres)'
      });
    }

    // Criar contexto de conversação simples
    const messages = [{ role: 'user', content: prompt }];
    const result = await gpt2.generateConversation(messages, options);

    res.json({
      success: true,
      data: {
        prompt,
        response: result.generatedText,
        metadata: result.metadata
      }
    });

  } catch (error) {
    logger.error('Erro na geração simples:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Rota otimizada para Discord com contexto social
router.post('/discord', async (req, res) => {
  try {
    const { 
      userMessage, 
      context = {}, 
      options = {} 
    } = req.body;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "userMessage" é obrigatório e deve ser uma string'
      });
    }

    // Processar contexto social para GPT-2
    const optimizedPrompt = createOptimizedPrompt(userMessage, context);
    
    // Configurações otimizadas para GPT-2
    const gpt2Options = {
      maxLength: Math.min(options.maxLength || 150, 200),
      temperature: options.temperature || 0.8,
      topP: options.topP || 0.9,
      topK: options.topK || 50,
      repetitionPenalty: 1.1,
      ...options
    };

    // Gerar resposta
    const messages = [{ role: 'user', content: optimizedPrompt }];
    const result = await gpt2.generateConversation(messages, gpt2Options);

    // Pós-processar resposta para Discord
    const processedResponse = postProcessResponse(result.generatedText, userMessage, context);

    res.json({
      success: true,
      data: {
        originalMessage: userMessage,
        response: processedResponse,
        contextUsed: !!context.userProfile,
        metadata: {
          ...result.metadata,
          promptLength: optimizedPrompt.length,
          contextType: getContextType(context)
        }
      }
    });

  } catch (error) {
    logger.error('Erro na conversação Discord:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Continuar uma conversação existente
router.post('/continue', async (req, res) => {
  try {
    const { 
      conversationHistory = [], 
      newMessage, 
      options = {},
      context = {} 
    } = req.body;

    if (!newMessage || typeof newMessage !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "newMessage" é obrigatório'
      });
    }

    // Adicionar nova mensagem ao histórico
    const messages = [
      ...conversationHistory,
      { role: 'user', content: newMessage }
    ];

    // Limitar histórico para evitar tokens excessivos
    const maxHistory = options.maxHistoryLength || 10;
    const limitedMessages = messages.slice(-maxHistory);

    const result = await gpt2.generateConversation(limitedMessages, options);

    res.json({
      success: true,
      data: {
        response: result.generatedText,
        conversationHistory: [
          ...limitedMessages,
          { role: 'assistant', content: result.generatedText }
        ],
        metadata: result.metadata,
        context
      }
    });

  } catch (error) {
    logger.error('Erro ao continuar conversação:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Obter sugestões de resposta
router.post('/suggestions', async (req, res) => {
  try {
    const { context, count = 3, options = {} } = req.body;

    if (!context || typeof context !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "context" é obrigatório'
      });
    }

    const suggestions = [];
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const result = await gpt2.generateConversation(
        [{ role: 'user', content: context }],
        {
          ...options,
          temperature: 0.8 + (i * 0.1), // Variar temperatura para diversidade
          maxLength: options.maxLength || 150
        }
      );
      
      suggestions.push({
        id: i + 1,
        text: result.generatedText,
        confidence: Math.random() * 0.3 + 0.7 // Simular confiança
      });
    }

    res.json({
      success: true,
      data: {
        context,
        suggestions,
        count: suggestions.length
      }
    });

  } catch (error) {
    logger.error('Erro ao gerar sugestões:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Funções auxiliares para otimização

function createOptimizedPrompt(userMessage, context) {
  const questionType = identifyQuestionType(userMessage);
  let prompt = '';
  
  // Base da personalidade da Mary
  const maryPersonality = 'Você é Mary, uma assistente virtual amigável, prestativa e inteligente.';
  
  if (questionType === 'math') {
    prompt = `${maryPersonality} Responda esta operação matemática de forma clara e direta: ${userMessage}`;
  } else if (questionType === 'greeting') {
    prompt = `${maryPersonality} Responda a esta saudação de forma calorosa e amigável: ${userMessage}`;
    
    // Adicionar contexto do canal se disponível
    if (context.channelContext) {
      prompt += ` Contexto: estamos no canal ${context.channelContext.name}.`;
    }
  } else if (questionType === 'wellbeing') {
    prompt = `${maryPersonality} A pessoa está perguntando sobre bem-estar. Responda de forma empática e interessada: ${userMessage}`;
  } else if (questionType === 'factual') {
    prompt = `${maryPersonality} Responda esta pergunta com informações úteis: ${userMessage}`;
  } else {
    // Conversação geral
    prompt = `${maryPersonality} Responda naturalmente a: ${userMessage}`;
  }
  
  // Adicionar contexto do usuário se disponível
  if (context.userProfile) {
    const style = context.userProfile.communication_style || 'neutral';
    const interests = context.userProfile.interests || [];
    
    if (style === 'casual') {
      prompt += ' Use um tom descontraído e amigável.';
    } else if (style === 'technical') {
      prompt += ' Use linguagem mais técnica e precisa.';
    }
    
    if (interests.length > 0 && questionType === 'conversational') {
      prompt += ` O usuário tem interesse em: ${interests.slice(0, 3).join(', ')}.`;
    }
  }
  
  // Adicionar contexto de mensagens recentes
  if (context.recentMessages && context.recentMessages.length > 0) {
    const relevantMessages = context.recentMessages.slice(0, 2);
    prompt += ' Contexto recente da conversa: ';
    relevantMessages.forEach((msg, idx) => {
      if (msg && msg !== userMessage) {
        prompt += `"${msg.substring(0, 40)}${msg.length > 40 ? '...' : ''}"${idx < relevantMessages.length - 1 ? ', ' : '.'}}`;
      }
    });
  }
  
  return prompt;
}

function identifyQuestionType(message) {
  const mathPattern = /(\d+\s*[\+\-\*\/\%]\s*\d+)|quanto\s+(é|eh)\s+|calcul|matemática|soma|subtração|multiplicação|divisão/i;
  const greetingPattern = /(oi|olá|ola|bom\s+dia|boa\s+tarde|boa\s+noite|hello|hi)/i;
  const wellbeingPattern = /(como\s+(você\s+está|está|vai)|tudo\s+bem|como\s+foi|e\s+você)/i;
  const factualPattern = /o\s+que\s+(é|eh)|quando\s+foi|quem\s+(é|eh)|onde\s+(fica|está)|como\s+funciona|qual\s+(é|eh)/i;
  
  if (mathPattern.test(message)) {
    return 'math';
  } else if (greetingPattern.test(message)) {
    return 'greeting';
  } else if (wellbeingPattern.test(message)) {
    return 'wellbeing';
  } else if (factualPattern.test(message)) {
    return 'factual';
  } else {
    return 'conversational';
  }
}

function postProcessResponse(response, originalMessage, context) {
  if (!response) return "Desculpe, não consegui processar sua mensagem.";
  
  let processed = response.trim();
  
  // Remover artefatos do prompt
  processed = processed.replace(/^(Você é Mary,.*?\.|Como Mary,.*?\.)/i, '');
  processed = processed.replace(/Responda.*?:/i, '');
  processed = processed.trim();
  
  // Remover repetições
  processed = removeRepetitions(processed);
  
  // Validar tipos específicos
  const questionType = identifyQuestionType(originalMessage);
  
  if (questionType === 'math') {
    processed = validateMathResponse(processed, originalMessage);
  } else if (questionType === 'wellbeing') {
    // Para perguntas de bem-estar, garantir resposta empática
    if (!processed.match(/(também|estou|bem|ótimo|legal|obrigad)/i)) {
      processed = `Estou bem, obrigada por perguntar! ${processed}`;
    }
  } else if (questionType === 'greeting') {
    // Para saudações, adicionar cordialidade
    if (!processed.match(/(oi|olá|bom|boa)/i)) {
      processed = `Olá! ${processed}`;
    }
  }
  
  // Garantir que não seja muito longa para Discord
  if (processed.length > 1800) {
    processed = processed.substring(0, 1800) + '...';
  }
  
  // Se ainda estiver muito genérica, melhorar
  if (processed.match(/^(vou fazer|não consegui|desculpe)/i) && questionType !== 'math') {
    processed = generateFallbackResponse(originalMessage, questionType, context);
  }
  
  return processed;
}

function generateFallbackResponse(originalMessage, questionType, context) {
  const fallbackResponses = {
    greeting: [
      "Olá! Como posso ajudar você hoje?",
      "Oi! É um prazer conversar com você!",
      "Olá! Espero que esteja tendo um ótimo dia!"
    ],
    wellbeing: [
      "Estou bem, obrigada por perguntar! E você, como está se sentindo?",
      "Estou ótima! Como foi seu dia?",
      "Muito bem! E você, tudo certo por aí?"
    ],
    conversational: [
      "Que interessante! Gostaria de saber mais sobre isso.",
      "Legal! O que mais você gostaria de conversar?",
      "Entendi! Posso ajudar você com alguma coisa específica?"
    ]
  };
  
  const responses = fallbackResponses[questionType] || fallbackResponses.conversational;
  return responses[Math.floor(Math.random() * responses.length)];
}

function removeRepetitions(text) {
  // Remover frases repetidas
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const uniqueSentences = [];
  
  for (const sentence of sentences) {
    const normalized = sentence.trim().toLowerCase();
    if (!uniqueSentences.some(s => s.toLowerCase() === normalized)) {
      uniqueSentences.push(sentence.trim());
    }
  }
  
  return uniqueSentences.join('. ').trim();
}

function validateMathResponse(response, originalMessage) {
  // Extrair números da pergunta original
  const mathMatch = originalMessage.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)/);
  
  if (mathMatch) {
    const [, num1, num2] = mathMatch;
    const operation = originalMessage.match(/[\+\-\*\/]/)[0];
    
    let correctAnswer;
    switch (operation) {
      case '+':
        correctAnswer = parseInt(num1) + parseInt(num2);
        break;
      case '-':
        correctAnswer = parseInt(num1) - parseInt(num2);
        break;
      case '*':
        correctAnswer = parseInt(num1) * parseInt(num2);
        break;
      case '/':
        correctAnswer = parseInt(num1) / parseInt(num2);
        break;
    }
    
    // Se a resposta não contém o número correto, fornecer resposta direta
    if (!response.includes(correctAnswer.toString())) {
      return `${num1} ${operation} ${num2} = ${correctAnswer}`;
    }
  }
  
  return response;
}

function getContextType(context) {
  if (context.userProfile && context.recentMessages) {
    return 'full';
  } else if (context.userProfile) {
    return 'user_only';
  } else if (context.recentMessages) {
    return 'messages_only';
  } else {
    return 'none';
  }
}

export default router;
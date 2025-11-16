import express from 'express';
import { getGPT2Service } from '../services/gpt2Service.js';
import { aiRateLimit } from '../utils/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const gpt2 = getGPT2Service();

// Middleware de rate limiting
router.use(aiRateLimit);

// Geração livre de texto
router.post('/text', async (req, res) => {
  try {
    const { 
      prompt,
      maxLength = 256,
      temperature = 0.7,
      topP = 0.9,
      numReturnSequences = 1,
      options = {}
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "prompt" é obrigatório e deve ser uma string'
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        error: true,
        message: 'Prompt muito longo (máximo 1000 caracteres)'
      });
    }

    const result = await gpt2.generateText({
      prompt,
      maxLength: Math.min(maxLength, 1024),
      temperature: Math.max(0.1, Math.min(temperature, 2.0)),
      topP: Math.max(0.1, Math.min(topP, 1.0)),
      numReturnSequences: Math.min(numReturnSequences, 3),
      ...options
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na geração de texto:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Geração de histórias
router.post('/story', async (req, res) => {
  try {
    const { 
      theme, 
      characters = [], 
      setting = '', 
      style = 'adventure',
      length = 'short' // short, medium, long
    } = req.body;

    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "theme" é obrigatório para gerar uma história'
      });
    }

    // Construir prompt para história
    let storyPrompt = `Escreva uma história de ${style}`;
    
    if (setting) {
      storyPrompt += ` ambientada em ${setting}`;
    }
    
    if (characters.length > 0) {
      storyPrompt += ` com os personagens: ${characters.join(', ')}`;
    }
    
    storyPrompt += `. Tema: ${theme}.\n\nHistória:\n`;

    const lengthMap = {
      short: 300,
      medium: 600,
      long: 1000
    };

    const result = await gpt2.generateText({
      prompt: storyPrompt,
      maxLength: lengthMap[length] || 300,
      temperature: 0.8,
      topP: 0.9
    });

    // Limpar e formatar a história
    let story = result.generatedText.trim();
    
    // Dividir em parágrafos para melhor formatação
    const paragraphs = story.split('\n')
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());

    res.json({
      success: true,
      data: {
        theme,
        characters,
        setting,
        style,
        length,
        story,
        paragraphs,
        metadata: result.metadata,
        wordCount: story.split(/\s+/).length
      }
    });

  } catch (error) {
    logger.error('Erro na geração de história:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Geração de poemas
router.post('/poem', async (req, res) => {
  try {
    const { 
      topic, 
      style = 'free', // free, sonnet, haiku, rhyme
      mood = 'neutral', // happy, sad, romantic, inspirational, neutral
      language = 'pt' // pt, en
    } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "topic" é obrigatório para gerar um poema'
      });
    }

    let poemPrompt = '';
    
    if (language === 'pt') {
      poemPrompt = `Escreva um poema em português sobre ${topic}`;
      
      switch (style) {
        case 'sonnet':
          poemPrompt += ' no formato de soneto (14 versos)';
          break;
        case 'haiku':
          poemPrompt += ' no formato de haicai (3 versos: 5-7-5 sílabas)';
          break;
        case 'rhyme':
          poemPrompt += ' com rimas';
          break;
        default:
          poemPrompt += ' em verso livre';
      }
      
      switch (mood) {
        case 'happy':
          poemPrompt += ', com tom alegre e positivo';
          break;
        case 'sad':
          poemPrompt += ', com tom melancólico';
          break;
        case 'romantic':
          poemPrompt += ', com tom romântico';
          break;
        case 'inspirational':
          poemPrompt += ', com tom inspirador';
          break;
      }
    } else {
      poemPrompt = `Write a poem in English about ${topic}`;
      // Adicionar estilos em inglês...
    }
    
    poemPrompt += ':\n\n';

    const maxLength = style === 'haiku' ? 100 : style === 'sonnet' ? 400 : 300;

    const result = await gpt2.generateText({
      prompt: poemPrompt,
      maxLength,
      temperature: 0.9,
      topP: 0.95
    });

    // Processar o poema
    const poem = result.generatedText.trim();
    const verses = poem.split('\n').filter(v => v.trim().length > 0);

    res.json({
      success: true,
      data: {
        topic,
        style,
        mood,
        language,
        poem,
        verses,
        verseCount: verses.length,
        metadata: result.metadata
      }
    });

  } catch (error) {
    logger.error('Erro na geração de poema:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Completar texto
router.post('/complete', async (req, res) => {
  try {
    const { 
      text, 
      completionLength = 200,
      style = 'continue', // continue, rephrase, expand
      options = {}
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório para completar'
      });
    }

    if (text.length > 1500) {
      return res.status(400).json({
        error: true,
        message: 'Texto muito longo (máximo 1500 caracteres)'
      });
    }

    let prompt = text;
    
    switch (style) {
      case 'rephrase':
        prompt = `Reescreva o seguinte texto de forma diferente:\n\n"${text}"\n\nTexto reescrito:\n`;
        break;
      case 'expand':
        prompt = `Expanda o seguinte texto adicionando mais detalhes:\n\n"${text}"\n\nTexto expandido:\n`;
        break;
      default: // continue
        // Usar o texto original para continuação
        break;
    }

    const result = await gpt2.generateText({
      prompt,
      maxLength: completionLength,
      temperature: style === 'rephrase' ? 0.8 : 0.7,
      topP: 0.9,
      ...options
    });

    res.json({
      success: true,
      data: {
        originalText: text,
        style,
        completion: result.generatedText,
        fullText: style === 'continue' ? text + result.generatedText : result.generatedText,
        metadata: result.metadata
      }
    });

  } catch (error) {
    logger.error('Erro na completação de texto:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Gerar múltiplas variações
router.post('/variations', async (req, res) => {
  try {
    const { 
      prompt,
      count = 3,
      maxLength = 200,
      diversityLevel = 'medium' // low, medium, high
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "prompt" é obrigatório'
      });
    }

    if (count > 5) {
      return res.status(400).json({
        error: true,
        message: 'Máximo 5 variações por requisição'
      });
    }

    const diversityMap = {
      low: { tempStart: 0.6, tempStep: 0.1 },
      medium: { tempStart: 0.7, tempStep: 0.2 },
      high: { tempStart: 0.8, tempStep: 0.3 }
    };

    const diversity = diversityMap[diversityLevel] || diversityMap.medium;
    const variations = [];

    for (let i = 0; i < count; i++) {
      const temperature = diversity.tempStart + (i * diversity.tempStep);
      
      const result = await gpt2.generateText({
        prompt,
        maxLength,
        temperature: Math.min(temperature, 1.5),
        topP: 0.9
      });

      variations.push({
        id: i + 1,
        text: result.generatedText,
        temperature: temperature,
        wordCount: result.generatedText.split(/\s+/).length
      });
    }

    res.json({
      success: true,
      data: {
        prompt,
        diversityLevel,
        variations,
        count: variations.length
      }
    });

  } catch (error) {
    logger.error('Erro na geração de variações:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

export default router;
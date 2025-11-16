import express from 'express';
import { getGPT2Service } from '../services/gpt2Service.js';
import { aiRateLimit } from '../utils/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const gpt2 = getGPT2Service();

// Middleware de rate limiting
router.use(aiRateLimit);

// Análise de sentimento
router.post('/sentiment', async (req, res) => {
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório e deve ser uma string'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: true,
        message: 'Texto muito longo (máximo 5000 caracteres)'
      });
    }

    const result = await gpt2.analyzeText(text, 'sentiment');

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na análise de sentimento:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Análise de emoções
router.post('/emotion', async (req, res) => {
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório e deve ser uma string'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: true,
        message: 'Texto muito longo (máximo 5000 caracteres)'
      });
    }

    const result = await gpt2.analyzeText(text, 'emotion');

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na análise de emoção:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Análise de toxicidade
router.post('/toxicity', async (req, res) => {
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório e deve ser uma string'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: true,
        message: 'Texto muito longo (máximo 5000 caracteres)'
      });
    }

    const result = await gpt2.analyzeText(text, 'toxicity');

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na análise de toxicidade:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Análise completa (sentimento + emoção + toxicidade)
router.post('/complete', async (req, res) => {
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório e deve ser uma string'
      });
    }

    if (text.length > 3000) {
      return res.status(400).json({
        error: true,
        message: 'Texto muito longo para análise completa (máximo 3000 caracteres)'
      });
    }

    // Executar todas as análises em paralelo
    const [sentiment, emotion, toxicity] = await Promise.all([
      gpt2.analyzeText(text, 'sentiment').catch(err => ({ error: err.message })),
      gpt2.analyzeText(text, 'emotion').catch(err => ({ error: err.message })),
      gpt2.analyzeText(text, 'toxicity').catch(err => ({ error: err.message }))
    ]);

    const analysis = {
      text,
      timestamp: new Date().toISOString(),
      analyses: {
        sentiment,
        emotion,
        toxicity
      }
    };

    // Calcular score geral
    let overallScore = 0;
    let scoreCount = 0;

    if (sentiment.topResult && !sentiment.error) {
      const sentimentScore = sentiment.topResult.label === 'POSITIVE' ? 1 : 
                           sentiment.topResult.label === 'NEGATIVE' ? -1 : 0;
      overallScore += sentimentScore * sentiment.topResult.score;
      scoreCount++;
    }

    if (toxicity.topResult && !toxicity.error) {
      const toxicityScore = toxicity.topResult.label === 'TOXIC' ? -1 : 1;
      overallScore += toxicityScore * toxicity.topResult.score;
      scoreCount++;
    }

    analysis.overallScore = scoreCount > 0 ? overallScore / scoreCount : 0;
    analysis.recommendation = getRecommendation(analysis);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Erro na análise completa:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Análise de tópicos/palavras-chave
router.post('/keywords', async (req, res) => {
  try {
    const { text, maxKeywords = 10 } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Campo "text" é obrigatório e deve ser uma string'
      });
    }

    // Análise simples de palavras-chave (pode ser melhorada com NLP mais avançado)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !isStopWord(word));

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word, count]) => ({
        word,
        count,
        relevance: count / words.length
      }));

    res.json({
      success: true,
      data: {
        text,
        totalWords: words.length,
        uniqueWords: Object.keys(wordCount).length,
        keywords
      }
    });

  } catch (error) {
    logger.error('Erro na análise de palavras-chave:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Função auxiliar para recomendações
function getRecommendation(analysis) {
  const { overallScore } = analysis;
  
  if (overallScore > 0.5) {
    return 'Mensagem positiva - adequada para resposta amigável';
  } else if (overallScore < -0.3) {
    return 'Mensagem negativa - considere resposta empática ou moderação';
  } else {
    return 'Mensagem neutra - resposta padrão apropriada';
  }
}

// Lista de stop words simples
function isStopWord(word) {
  const stopWords = [
    'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'ou', 'mas',
    'que', 'se', 'em', 'na', 'no', 'nas', 'nos', 'com', 'por', 'para', 'ser',
    'ter', 'estar', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had'
  ];
  
  return stopWords.includes(word);
}

export default router;
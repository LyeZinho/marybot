/**
 * @file mediaAnalyzer.js
 * @description Sistema para análise e reconhecimento de imagens, GIFs e vídeos
 * Extrai metadados, analisa conteúdo e gera contexto para o sistema de aprendizado
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { logger } from './logger.js';
import { getPrisma } from '../database/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MediaAnalyzer {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.supportedVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.tempDir = path.join(__dirname, '../temp/media');
    
    // Contextos comuns para diferentes tipos de mídia
    this.contextMappings = {
      image: {
        meme: ['meme', 'engraçado', 'humor', 'piada'],
        anime: ['anime', 'manga', 'waifu', 'otaku'],
        art: ['arte', 'desenho', 'ilustração', 'fanart'],
        screenshot: ['screenshot', 'print', 'captura'],
        photo: ['foto', 'fotografia', 'selfie'],
        reaction: ['reação', 'mood', 'sentimento'],
        game: ['jogo', 'gaming', 'gameplay']
      },
      gif: {
        reaction: ['reação', 'mood', 'sentimento', 'expressão'],
        meme: ['meme', 'engraçado', 'humor'],
        anime: ['anime', 'manga', 'reaction'],
        celebration: ['comemoração', 'festa', 'alegria'],
        sad: ['triste', 'tristeza', 'decepção'],
        excited: ['animado', 'empolgado', 'feliz']
      },
      video: {
        tiktok: ['tiktok', 'viral', 'trend'],
        gameplay: ['gameplay', 'jogo', 'gaming'],
        movie: ['filme', 'cinema', 'trailer'],
        anime: ['anime', 'episódio', 'clip'],
        music: ['música', 'clipe', 'mv'],
        meme: ['meme', 'engraçado', 'viral']
      }
    };
    
    this.initialized = false;
  }

  /**
   * Inicializa o analisador de mídia
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Criar diretório temporário se não existir
      await fs.mkdir(this.tempDir, { recursive: true });
      
      console.log('📸 Sistema de análise de mídia inicializado');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Erro ao inicializar analisador de mídia:', error.message);
    }
  }

  /**
   * Analisa uma mensagem que contém attachments
   */
  async analyzeMessage(message) {
    if (!message.attachments || message.attachments.size === 0) {
      return null;
    }

    const results = [];
    
    for (const [id, attachment] of message.attachments) {
      try {
        const analysis = await this.analyzeAttachment(attachment, message);
        if (analysis) {
          results.push(analysis);
        }
      } catch (error) {
        console.error(`❌ Erro ao analisar attachment ${id}:`, error.message);
      }
    }

    return results.length > 0 ? results : null;
  }

  /**
   * Analisa um attachment específico
   */
  async analyzeAttachment(attachment, message) {
    const { name, size, url, contentType } = attachment;
    
    // Verificar tamanho
    if (size > this.maxFileSize) {
      return {
        type: 'oversized',
        filename: name,
        size: size,
        message: `Arquivo muito grande (${(size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    // Determinar tipo de mídia
    const mediaType = this.getMediaType(contentType, name);
    if (!mediaType) {
      return null; // Não é mídia suportada
    }

    // Análise básica de metadados
    const basicAnalysis = {
      type: mediaType,
      filename: name,
      size: size,
      contentType: contentType,
      url: url,
      timestamp: message.createdTimestamp,
      author: {
        id: message.author.id,
        username: message.author.username
      },
      guild: message.guild ? {
        id: message.guild.id,
        name: message.guild.name
      } : null,
      channel: {
        id: message.channel.id,
        name: message.channel.name || 'DM'
      }
    };

    // Análise contextual baseada no nome e conteúdo da mensagem
    const context = this.analyzeContext(attachment, message);
    
    // Análise de sentimento baseada no contexto
    const sentiment = this.analyzeSentiment(message.content, context);

    return {
      ...basicAnalysis,
      context: context,
      sentiment: sentiment,
      description: this.generateDescription(basicAnalysis, context, message),
      keywords: this.extractKeywords(attachment, message, context)
    };
  }

  /**
   * Determina o tipo de mídia baseado no contentType e nome
   */
  getMediaType(contentType, filename) {
    if (this.supportedImageTypes.includes(contentType)) {
      return filename.toLowerCase().endsWith('.gif') ? 'gif' : 'image';
    }
    
    if (this.supportedVideoTypes.includes(contentType)) {
      return 'video';
    }
    
    // Fallback baseado na extensão
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const videoExts = ['.mp4', '.webm', '.mov', '.avi'];
    
    if (ext === '.gif') return 'gif';
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    
    return null;
  }

  /**
   * Analisa o contexto da mídia baseado no nome e mensagem
   */
  analyzeContext(attachment, message) {
    const filename = attachment.name.toLowerCase();
    const messageContent = message.content.toLowerCase();
    const combined = `${filename} ${messageContent}`;
    
    const mediaType = this.getMediaType(attachment.contentType, attachment.name);
    const contexts = this.contextMappings[mediaType] || {};
    
    const detectedContexts = [];
    
    // Verificar contextos específicos
    for (const [contextType, keywords] of Object.entries(contexts)) {
      const matches = keywords.filter(keyword => 
        combined.includes(keyword) || 
        filename.includes(keyword)
      );
      
      if (matches.length > 0) {
        detectedContexts.push({
          type: contextType,
          confidence: matches.length / keywords.length,
          matchedKeywords: matches
        });
      }
    }

    // Ordenar por confiança
    detectedContexts.sort((a, b) => b.confidence - a.confidence);
    
    return detectedContexts.length > 0 ? detectedContexts[0] : {
      type: 'generic',
      confidence: 0.1,
      matchedKeywords: []
    };
  }

  /**
   * Analisa sentimento baseado no contexto (sistema social removido)
   */
  analyzeSentiment(messageContent, context) {
    // Sistema de análise de sentimento removido - retorna neutro
    return 'neutral';
  }

  /**
   * Gera descrição da mídia
   */
  generateDescription(analysis, context, message) {
    const { type, filename, size } = analysis;
    const sizeKB = (size / 1024).toFixed(1);
    
    const contextDescriptions = {
      meme: 'compartilhou um meme',
      anime: 'postou conteúdo de anime', 
      art: 'compartilhou uma arte',
      reaction: 'enviou uma reação',
      game: 'compartilhou conteúdo de jogo',
      celebration: 'está comemorando',
      music: 'compartilhou música',
      generic: `enviou ${type === 'gif' ? 'um GIF' : type === 'image' ? 'uma imagem' : 'um vídeo'}`
    };
    
    const baseDescription = contextDescriptions[context.type] || contextDescriptions.generic;
    
    // Adicionar contexto da mensagem se houver
    const messageContext = message.content.trim();
    if (messageContext && messageContext.length > 0 && messageContext.length < 100) {
      return `${baseDescription}: "${messageContext}" (${filename}, ${sizeKB}KB)`;
    }
    
    return `${baseDescription} (${filename}, ${sizeKB}KB)`;
  }

  /**
   * Extrai palavras-chave relevantes
   */
  extractKeywords(attachment, message, context) {
    const keywords = [];
    
    // Tipo de mídia
    keywords.push(this.getMediaType(attachment.contentType, attachment.name));
    
    // Contexto detectado
    if (context.matchedKeywords) {
      keywords.push(...context.matchedKeywords);
    }
    
    // Palavras do nome do arquivo (filtradas)
    const filenameWords = attachment.name
      .replace(/\.[^/.]+$/, '') // remover extensão
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter(word => word.length > 2);
    
    keywords.push(...filenameWords.slice(0, 3)); // máximo 3 palavras do filename
    
    // Palavras da mensagem (filtradas)
    if (message.content) {
      const messageWords = message.content
        .toLowerCase()
        .replace(/[^\w\sáéíóúãõç]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['http', 'https', 'www'].some(prefix => word.startsWith(prefix)));
      
      keywords.push(...messageWords.slice(0, 5)); // máximo 5 palavras da mensagem
    }
    
    // Remover duplicatas e limitar
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Baixa e analisa arquivo temporariamente (para análises futuras mais avançadas)
   */
  async downloadForAnalysis(url, filename) {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'MaryBot Media Analyzer'
        }
      });
      
      const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${filename}`);
      const writer = fs.createWriteStream(tempFilePath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', reject);
      });
      
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error.message);
      return null;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  async cleanupTemp() {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoff = Date.now() - (60 * 60 * 1000); // 1 hora atrás
      
      for (const file of files) {
        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filepath);
        }
      }
      
    } catch (error) {
      // Erro silencioso na limpeza
    }
  }

  /**
   * Gera relatório de estatísticas de mídia
   */
  generateMediaStats(mediaAnalyses) {
    if (!mediaAnalyses || mediaAnalyses.length === 0) {
      return null;
    }

    const stats = {
      total: mediaAnalyses.length,
      byType: {},
      byContext: {},
      bySentiment: {},
      totalSize: 0,
      averageSize: 0
    };

    for (const analysis of mediaAnalyses) {
      // Por tipo
      stats.byType[analysis.type] = (stats.byType[analysis.type] || 0) + 1;
      
      // Por contexto
      const contextType = analysis.context?.type || 'unknown';
      stats.byContext[contextType] = (stats.byContext[contextType] || 0) + 1;
      
      // Por sentimento
      stats.bySentiment[analysis.sentiment] = (stats.bySentiment[analysis.sentiment] || 0) + 1;
      
      // Tamanho
      stats.totalSize += analysis.size;
    }

    stats.averageSize = stats.totalSize / stats.total;

    return stats;
  }
}

// Instância global
export const mediaAnalyzer = new MediaAnalyzer();
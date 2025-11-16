/**
 * 🔞 Serviço de Detecção NSFW
 * Utiliza modelo Falconsai/nsfw_image_detection para classificar imagens
 */

import { HfInference } from '@huggingface/inference';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import sharp from 'sharp';
// Removido nsfwjs devido a problemas de compatibilidade ES modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class NSFWDetectionService {
  constructor() {
    this.hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY, { 
      endpoint: 'https://router.huggingface.co/hf-inference' 
    }) : null;
    
    this.modelPath = join(dirname(__dirname), 'nsfw_detection');
    this.isInitialized = false;
    this.config = null;
    this.modelName = 'Falconsai/nsfw_image_detection';
    // Modelo nsfwjs removido devido a problemas de compatibilidade
    
    // Thresholds para classificação NSFW (otimizados)
    this.thresholds = {
      safe: 0.7,        // >= 0.7 = seguro
      questionable: 0.4, // 0.4-0.7 = questionável 
      unsafe: 0.6       // >= 0.6 nsfw = não seguro
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Inicialização de análise por pixels para detecção NSFW
      logger.info('🔞 Inicializando análise NSFW baseada em pixels...');
      
      // Verificar se o modelo existe localmente
      const configPath = join(this.modelPath, 'config.json');
      
      if (existsSync(configPath)) {
        this.config = JSON.parse(readFileSync(configPath, 'utf8'));
        logger.info('Modelo NSFW carregado localmente:', {
          modelId: this.config.model_id || this.modelName,
          task: this.config.pipeline_tag || 'image-classification'
        });
      } else {
        logger.warn('Modelo NSFW local não encontrado');
      }
      
      this.isInitialized = true;
      logger.info('Serviço NSFW inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar serviço NSFW:', error);
      throw error;
    }
  }

  /**
   * Processar imagem para análise
   */
  async preprocessImage(imageBuffer) {
    try {
      // Redimensionar e converter para formato compatível
      const processedImage = await sharp(imageBuffer)
        .resize(224, 224, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      return processedImage;
    } catch (error) {
      logger.error('Erro ao processar imagem:', error);
      throw new Error('Erro ao processar imagem para análise');
    }
  }

  /**
   * Baixar imagem de URL
   */
  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'MaryBot-AI-Server/1.0'
        },
        timeout: 10000
      });

      if (response.headers['content-type']?.startsWith('image/')) {
        return Buffer.from(response.data);
      } else {
        throw new Error('URL não contém uma imagem válida');
      }
    } catch (error) {
      logger.error('Erro ao baixar imagem:', error);
      throw new Error('Não foi possível baixar a imagem da URL');
    }
  }

  /**
   * Classificar imagem como NSFW ou segura
   */
  async classifyImage(imageData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Serviço NSFW não foi inicializado');
    }

    try {
      let imageBuffer;
      
      // Verificar se é URL ou buffer
      if (typeof imageData === 'string') {
        imageBuffer = await this.downloadImage(imageData);
      } else {
        imageBuffer = imageData;
      }

      // Pré-processar imagem
      const processedImage = await this.preprocessImage(imageBuffer);

      let result;

      // Tentar usar API do Hugging Face primeiro
      if (this.hf) {
        try {
          result = await this.hf.imageClassification({
            data: processedImage,
            model: this.modelName
          });
        } catch (error) {
          logger.warn('Falha na API Hugging Face, usando classificação local:', error.message);
          result = await this.classifyLocally(processedImage);
        }
      } else {
        result = await this.classifyLocally(processedImage);
      }

      // Processar resultado
      return this.processResult(result, options);

    } catch (error) {
      logger.error('Erro na classificação NSFW:', error);
      throw error;
    }
  }

  /**
   * Classificação local baseada em análise de pixels e características
   */
  async classifyLocally(imageBuffer) {
    try {
      logger.info('🔞 Usando análise avançada de pixels para classificação NSFW');
      
      // Processar imagem para análise
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      // Extrair estatísticas da imagem
      const stats = await image.stats();
      
      // Converter para RGB e analisar pixels
      const { data, info } = await image
        .resize(128, 128, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Análise de características NSFW
      const analysis = this.analyzeImageFeatures(data, info, stats);
      
      logger.info('📊 Análise de características:', {
        skinToneRatio: analysis.skinToneRatio.toFixed(3),
        edgeComplexity: analysis.edgeComplexity.toFixed(3),
        colorVariance: analysis.colorVariance.toFixed(3),
        suspiciousRegions: analysis.suspiciousRegions,
        finalScore: analysis.nsfwScore.toFixed(3)
      });
      
      const safeScore = 1 - analysis.nsfwScore;
      const nsfwScore = analysis.nsfwScore;
      
      return [
        { label: 'safe', score: safeScore },
        { label: 'nsfw', score: nsfwScore }
      ];
      
    } catch (error) {
      logger.error('❌ Erro na classificação por análise de pixels:', error);
      // Em caso de erro, ser conservativo e assumir potencial NSFW
      return [
        { label: 'safe', score: 0.2 },
        { label: 'nsfw', score: 0.8 }
      ];
    }
  }

  /**
   * Analisar características da imagem que podem indicar conteúdo NSFW
   */
  analyzeImageFeatures(pixelData, info, stats) {
    const { width, height, channels } = info;
    const pixelCount = width * height;
    
    let skinPixels = 0;
    let totalBrightness = 0;
    let edgePixels = 0;
    let warmPixels = 0;
    
    // Analisar pixels em grupos de 3 (RGB)
    for (let i = 0; i < pixelData.length; i += 3) {
      const r = pixelData[i];
      const g = pixelData[i + 1]; 
      const b = pixelData[i + 2];
      
      // Detectar tons de pele (algoritmo melhorado)
      if (this.isSkinTone(r, g, b)) {
        skinPixels++;
      }
      
      // Calcular brilho
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Detectar cores \"quentes\" (tons avermelhados/rosados)
      if (r > g && r > b && r > 100) {
        warmPixels++;
      }
      
      // Detectar bordas (diferença alta entre pixels adjacentes)
      if (i > 0) {
        const prevR = pixelData[i - 3];
        const diff = Math.abs(r - prevR);
        if (diff > 50) {
          edgePixels++;
        }
      }
    }
    
    // Calcular métricas
    const skinToneRatio = skinPixels / pixelCount;
    const avgBrightness = totalBrightness / pixelCount;
    const edgeComplexity = edgePixels / pixelCount;
    const warmToneRatio = warmPixels / pixelCount;
    
    // Calcular variância de cor manualmente (sempre usar fallback confiável)
    const colorVariance = this.calculateColorVariance(pixelData);
    
    // Calcular score NSFW baseado em múltiplos indicadores (balanceado)
    let nsfwScore = 0;
    
    // Análise de tons de pele (mais sensível)
    if (skinToneRatio > 0.4) nsfwScore += 0.5;      // Alto
    else if (skinToneRatio > 0.25) nsfwScore += 0.3;  // Moderado
    else if (skinToneRatio > 0.15) nsfwScore += 0.1;  // Baixo
    
    // Cores quentes/rosadas (indicativo de nudez/conteúdo sexual)
    if (warmToneRatio > 0.35) nsfwScore += 0.3;
    else if (warmToneRatio > 0.25) nsfwScore += 0.2;
    else if (warmToneRatio > 0.15) nsfwScore += 0.1;
    
    // Baixa complexidade de bordas (superfícies "lisas" como pele nua)
    if (edgeComplexity < 0.06) {
      nsfwScore += 0.2;
      // Bonus se combinado com tons de pele
      if (skinToneRatio > 0.2) nsfwScore += 0.1;
    }
    
    // Baixa variância de cor (poucos tons, típico de nudez)
    if (colorVariance > 0 && colorVariance < 25) {
      nsfwScore += 0.1;
      // Bonus se combinado com outros fatores
      if (skinToneRatio > 0.2 && warmToneRatio > 0.2) nsfwScore += 0.1;
    }
    
    // Bônus para combinação de múltiplos fatores suspeitos
    if (skinToneRatio > 0.2 && warmToneRatio > 0.2 && edgeComplexity < 0.08) {
      nsfwScore += 0.15; // Múltiplos indicadores
    }
    
    // Brilho muito alto ou muito baixo pode ser suspeito
    if (avgBrightness > 200 || avgBrightness < 50) nsfwScore += 0.1;
    
    // Contar regiões suspeitas com thresholds mais altos
    const suspiciousRegions = this.countSuspiciousRegions(skinToneRatio, warmToneRatio, edgeComplexity);
    
    // Só adicionar score se múltiplas regiões suspeitas
    if (suspiciousRegions >= 3) nsfwScore += 0.2;
    
    // Normalizar score entre 0 e 1
    nsfwScore = Math.min(1, nsfwScore);
    
    return {
      skinToneRatio,
      edgeComplexity,
      colorVariance,
      warmToneRatio,
      avgBrightness,
      suspiciousRegions,
      nsfwScore
    };
  }

  /**
   * Detectar se uma cor RGB é tom de pele (balanceado para real e arte)
   */
  isSkinTone(r, g, b) {
    // Algoritmo híbrido - detecta pele real E arte/anime com pele exposta
    
    // Algoritmo 1: Pele humana realística (mais restritivo)
    const isRealisticSkin = (r >= 140 && r <= 255) && 
                           (g >= 100 && g <= 220) && 
                           (b >= 70 && b <= 180) &&
                           (r > g) && (g >= b) &&
                           (r - g >= 15) && (g - b >= 5);
    
    // Algoritmo 2: Pele em arte/anime (menos restritivo para cores não-naturais)
    const isArtSkin = (r >= 120 && r <= 255) && 
                     (g >= 80 && g <= 230) && 
                     (b >= 60 && b <= 200) &&
                     (r >= g * 0.9) && // R pode ser similar ao G em arte
                     (Math.abs(r - g) >= 5); // Alguma diferença mínima
    
    // Verificar se não é cor muito saturada/artificial (evitar falsos positivos)
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    
    // Excluir cores muito brilhantes, muito escuras ou muito saturadas
    const isValidColor = brightness >= 80 && brightness <= 240 && 
                        saturation >= 10 && saturation <= 100;
    
    // Verificar proporções gerais de tons quentes (característico de pele)
    const warmness = (r + g * 0.8) / (r + g + b);
    const isWarmTone = warmness >= 0.55; // Tons quentes
    
    return (isRealisticSkin || isArtSkin) && isValidColor && isWarmTone;
  }

  /**
   * Calcular variância de cor manualmente
   */
  calculateColorVariance(pixelData) {
    let rSum = 0, gSum = 0, bSum = 0;
    const pixelCount = pixelData.length / 3;
    
    // Calcular médias
    for (let i = 0; i < pixelData.length; i += 3) {
      rSum += pixelData[i];
      gSum += pixelData[i + 1];
      bSum += pixelData[i + 2];
    }
    
    const rMean = rSum / pixelCount;
    const gMean = gSum / pixelCount;
    const bMean = bSum / pixelCount;
    
    // Calcular variâncias
    let rVar = 0, gVar = 0, bVar = 0;
    for (let i = 0; i < pixelData.length; i += 3) {
      rVar += Math.pow(pixelData[i] - rMean, 2);
      gVar += Math.pow(pixelData[i + 1] - gMean, 2);
      bVar += Math.pow(pixelData[i + 2] - bMean, 2);
    }
    
    return (Math.sqrt(rVar / pixelCount) + Math.sqrt(gVar / pixelCount) + Math.sqrt(bVar / pixelCount)) / 3;
  }

  /**
   * Contar regiões potencialmente suspeitas (thresholds mais altos)
   */
  countSuspiciousRegions(skinRatio, warmRatio, edgeComplexity) {
    let regions = 0;
    
    if (skinRatio > 0.5) regions++;      // Mais restritivo
    if (warmRatio > 0.4) regions++;      // Mais restritivo
    if (edgeComplexity < 0.05) regions++; // Mais restritivo
    
    return regions;
  }

  /**
   * Processar resultado da classificação
   */
  processResult(result, options = {}) {
    try {
      // Normalizar resultado para formato padrão
      const scores = {};
      
      result.forEach(item => {
        const label = item.label.toLowerCase();
        scores[label] = item.score;
      });

      // Determinar classificação final
      const safeScore = scores.safe || scores.normal || 0;
      const nsfwScore = scores.nsfw || scores.porn || scores.explicit || 0;
      
      let classification = 'unknown';
      let confidence = 0;
      let riskLevel = 'medium';

      // Lógica balanceada - evitar falsos positivos
      if (nsfwScore >= this.thresholds.unsafe) {
        classification = 'nsfw';
        confidence = nsfwScore;
        riskLevel = 'high';
      } else if (safeScore >= this.thresholds.safe || nsfwScore < 0.5) {
        classification = 'safe';
        confidence = safeScore;
        riskLevel = 'low';
      } else {
        // Só considerar questionável se realmente incerto
        classification = 'questionable';
        confidence = Math.max(safeScore, nsfwScore);
        riskLevel = 'medium';
      }

      const response = {
        classification,
        confidence: confidence.toFixed(3),
        riskLevel,
        scores: {
          safe: safeScore.toFixed(3),
          nsfw: nsfwScore.toFixed(3)
        },
        isBlocked: classification === 'nsfw' || (classification === 'questionable' && confidence > 0.5),
        timestamp: new Date().toISOString(),
        model: this.modelName
      };

      // Log para auditoria
      logger.info('Classificação NSFW realizada:', {
        classification,
        confidence: response.confidence,
        riskLevel,
        blocked: response.isBlocked
      });

      return response;

    } catch (error) {
      logger.error('Erro ao processar resultado NSFW:', error);
      throw error;
    }
  }

  /**
   * Verificar múltiplas imagens
   */
  async classifyMultiple(imageUrls, options = {}) {
    if (!Array.isArray(imageUrls)) {
      throw new Error('imageUrls deve ser um array');
    }

    const results = [];
    
    for (const url of imageUrls) {
      try {
        const result = await this.classifyImage(url, options);
        results.push({
          url,
          ...result
        });
      } catch (error) {
        results.push({
          url,
          error: error.message,
          classification: 'error',
          isBlocked: false
        });
      }
    }

    return {
      results,
      summary: {
        total: imageUrls.length,
        safe: results.filter(r => r.classification === 'safe').length,
        nsfw: results.filter(r => r.classification === 'nsfw').length,
        questionable: results.filter(r => r.classification === 'questionable').length,
        errors: results.filter(r => r.classification === 'error').length,
        blocked: results.filter(r => r.isBlocked).length
      }
    };
  }

  /**
   * Obter estatísticas do serviço
   */
  getServiceInfo() {
    return {
      modelName: this.modelName,
      modelPath: this.modelPath,
      isInitialized: this.isInitialized,
      hasLocalModel: existsSync(join(this.modelPath, 'config.json')),
      hasAPIKey: !!this.hf,
      thresholds: this.thresholds,
      supportedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      maxImageSize: '10MB'
    };
  }
}

// Instância singleton
export const nsfwService = new NSFWDetectionService();

export default NSFWDetectionService;
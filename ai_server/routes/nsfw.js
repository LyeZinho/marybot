/**
 * 🔞 Rotas para Detecção NSFW
 * Endpoints para análise de conteúdo de imagens
 */

import { Router } from 'express';
import multer from 'multer';
import { nsfwService } from '../services/nsfwService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Configurar multer para upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // máximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// Analisar imagem por URL
router.post('/analyze-url', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'URL da imagem é obrigatória'
      });
    }

    // Validar URL básica
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: true,
        message: 'URL inválida fornecida'
      });
    }

    const result = await nsfwService.classifyImage(url, options);

    res.json({
      success: true,
      data: {
        url,
        ...result
      }
    });

  } catch (error) {
    logger.error('Erro na análise de URL:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Analisar imagem por upload
router.post('/analyze-upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    const result = await nsfwService.classifyImage(req.file.buffer, options);

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        size: req.file.size,
        ...result
      }
    });

  } catch (error) {
    logger.error('Erro na análise de upload:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Analisar múltiplas imagens por URL
router.post('/analyze-multiple', async (req, res) => {
  try {
    const { urls, options = {} } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Array de URLs é obrigatório e deve ter pelo menos uma URL'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        error: true,
        message: 'Máximo de 10 URLs por requisição'
      });
    }

    // Validar todas as URLs
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: true,
          message: `URL inválida: ${url}`
        });
      }
    }

    const result = await nsfwService.classifyMultiple(urls, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Erro na análise múltipla:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Analisar múltiplas imagens por upload
router.post('/analyze-uploads', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const options = req.body.options ? JSON.parse(req.body.options) : {};
    const results = [];

    for (const file of req.files) {
      try {
        const result = await nsfwService.classifyImage(file.buffer, options);
        results.push({
          filename: file.originalname,
          size: file.size,
          ...result
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          error: error.message,
          classification: 'error',
          isBlocked: false
        });
      }
    }

    const summary = {
      total: req.files.length,
      safe: results.filter(r => r.classification === 'safe').length,
      nsfw: results.filter(r => r.classification === 'nsfw').length,
      questionable: results.filter(r => r.classification === 'questionable').length,
      errors: results.filter(r => r.classification === 'error').length,
      blocked: results.filter(r => r.isBlocked).length
    };

    res.json({
      success: true,
      data: {
        results,
        summary
      }
    });

  } catch (error) {
    logger.error('Erro na análise de uploads múltiplos:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Analisar mensagem do Discord (imagens anexadas)
router.post('/analyze-discord', async (req, res) => {
  try {
    const { attachments, options = {} } = req.body;

    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).json({
        error: true,
        message: 'Lista de anexos é obrigatória'
      });
    }

    // Filtrar apenas imagens
    const imageAttachments = attachments.filter(att => 
      att.contentType && att.contentType.startsWith('image/')
    );

    if (imageAttachments.length === 0) {
      return res.json({
        success: true,
        data: {
          hasImages: false,
          message: 'Nenhuma imagem encontrada nos anexos'
        }
      });
    }

    const urls = imageAttachments.map(att => att.url);
    const result = await nsfwService.classifyMultiple(urls, options);

    // Adicionar informações dos anexos originais
    result.results = result.results.map((res, index) => ({
      ...res,
      attachment: {
        id: imageAttachments[index].id,
        filename: imageAttachments[index].filename,
        size: imageAttachments[index].size,
        contentType: imageAttachments[index].contentType
      }
    }));

    res.json({
      success: true,
      data: {
        hasImages: true,
        ...result
      }
    });

  } catch (error) {
    logger.error('Erro na análise do Discord:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Obter informações do serviço
router.get('/info', async (req, res) => {
  try {
    const info = nsfwService.getServiceInfo();
    
    res.json({
      success: true,
      data: {
        service: 'NSFW Detection Service',
        version: '1.0.0',
        ...info,
        endpoints: [
          'POST /analyze-url - Analisar imagem por URL',
          'POST /analyze-upload - Analisar imagem por upload',
          'POST /analyze-multiple - Analisar múltiplas URLs',
          'POST /analyze-uploads - Analisar múltiplos uploads',
          'POST /analyze-discord - Analisar anexos do Discord',
          'GET /info - Informações do serviço'
        ]
      }
    });

  } catch (error) {
    logger.error('Erro ao obter informações NSFW:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Health check específico do NSFW
router.get('/health', async (req, res) => {
  try {
    const info = nsfwService.getServiceInfo();
    
    res.json({
      status: 'healthy',
      service: 'nsfw-detection',
      initialized: info.isInitialized,
      model: info.hasLocalModel ? 'local' : 'api',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'nsfw-detection',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de erro para uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: true,
        message: 'Arquivo muito grande (máximo 10MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: true,
        message: 'Muitos arquivos (máximo 5)'
      });
    }
  }
  
  if (error.message === 'Tipo de arquivo não suportado') {
    return res.status(400).json({
      error: true,
      message: 'Tipo de arquivo não suportado. Use: JPEG, PNG ou WebP'
    });
  }

  next(error);
});

export default router;
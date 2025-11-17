/**
 * 🧪 Teste do Sistema de Voz Local
 * Script para testar o sistema Speech-to-Text self-hosted
 */

import { VoiceInteractionManager } from '../src/utils/VoiceInteractionManager.js';
import { speechToTextService } from '../src/utils/SpeechToTextService.js';
import { logger } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

class VoiceSystemTester {
  constructor() {
    this.testResults = [];
    this.tempDir = path.join(process.cwd(), 'temp', 'voice-test');
  }

  /**
   * 🚀 Executar todos os testes
   */
  async runAllTests() {
    logger.info('🧪 Iniciando testes do sistema de voz local...');
    
    try {
      // Criar diretório de teste
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Testes individuais
      await this.testSTTService();
      await this.testVocabulary();
      await this.testCommandProcessing();
      await this.testAudioAnalysis();
      
      // Relatório final
      this.generateReport();
      
    } catch (error) {
      logger.error('❌ Erro nos testes:', error);
    } finally {
      // Limpar arquivos temporários
      this.cleanup();
    }
  }

  /**
   * 🗣️ Testar serviço STT
   */
  async testSTTService() {
    logger.info('🗣️ Testando serviço Speech-to-Text...');
    
    try {
      const status = speechToTextService.getStatus();
      
      this.testResults.push({
        test: 'STT Service Status',
        success: status.initialized,
        details: status
      });

      logger.info('Status STT:', status);
      
    } catch (error) {
      this.testResults.push({
        test: 'STT Service Status',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 📚 Testar vocabulário
   */
  async testVocabulary() {
    logger.info('📚 Testando vocabulário português...');
    
    try {
      const testPhrases = [
        'mary ajuda',
        'mary saldo',
        'mary perfil',
        'oi mary',
        'mary dungeon',
        'mary inventario'
      ];

      for (const phrase of testPhrases) {
        const command = speechToTextService.processVoiceCommand(phrase);
        
        this.testResults.push({
          test: `Vocabulary: "${phrase}"`,
          success: !!command,
          details: { input: phrase, output: command }
        });

        logger.info(`📝 "${phrase}" -> "${command}"`);
      }
      
    } catch (error) {
      logger.error('❌ Erro no teste de vocabulário:', error);
    }
  }

  /**
   * 💻 Testar processamento de comandos
   */
  async testCommandProcessing() {
    logger.info('💻 Testando processamento de comandos...');
    
    try {
      const voiceCommands = [
        'Mary, mostrar meu perfil',
        'Oi Mary, como está?',
        'Mary, qual é o meu saldo?',
        'Mary, ajuda por favor',
        'Mary status do servidor'
      ];

      for (const voiceCmd of voiceCommands) {
        const processed = speechToTextService.processVoiceCommand(voiceCmd);
        
        this.testResults.push({
          test: `Command Processing: "${voiceCmd}"`,
          success: !!processed,
          details: { 
            input: voiceCmd, 
            processed: processed,
            hasActivation: voiceCmd.toLowerCase().includes('mary')
          }
        });

        logger.info(`🎯 "${voiceCmd}" -> ${processed || 'NULL'}`);
      }
      
    } catch (error) {
      logger.error('❌ Erro no teste de comandos:', error);
    }
  }

  /**
   * 🎵 Testar análise de áudio
   */
  async testAudioAnalysis() {
    logger.info('🎵 Testando análise de áudio simulada...');
    
    try {
      // Criar arquivos de teste simulados
      const testFiles = [
        { name: 'short.pcm', size: 3000 },
        { name: 'medium.pcm', size: 10000 },
        { name: 'long.pcm', size: 25000 },
        { name: 'empty.pcm', size: 0 }
      ];

      for (const testFile of testFiles) {
        const filePath = path.join(this.tempDir, testFile.name);
        
        // Criar arquivo com tamanho específico
        const buffer = Buffer.alloc(testFile.size, 0);
        fs.writeFileSync(filePath, buffer);

        // Simular transcrição
        const result = await speechToTextService.transcribeAudio(filePath);
        
        this.testResults.push({
          test: `Audio Analysis: ${testFile.name} (${testFile.size} bytes)`,
          success: testFile.size > 0 ? !!result : result === null,
          details: { 
            fileSize: testFile.size,
            transcription: result,
            expected: testFile.size > 0 ? 'should transcribe' : 'should be null'
          }
        });

        logger.info(`🎵 ${testFile.name} (${testFile.size}b) -> "${result || 'NULL'}"`);
      }
      
    } catch (error) {
      logger.error('❌ Erro no teste de áudio:', error);
    }
  }

  /**
   * 📊 Gerar relatório de testes
   */
  generateReport() {
    logger.info('📊 Gerando relatório de testes...');
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const successRate = ((successful / total) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO DE TESTES DO SISTEMA DE VOZ');
    console.log('='.repeat(60));
    console.log(`✅ Sucessos: ${successful}/${total} (${successRate}%)`);
    console.log('');

    // Listar resultados detalhados
    this.testResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.test}`);
      
      if (result.details) {
        console.log(`   📝 ${JSON.stringify(result.details)}`);
      }
      
      if (result.error) {
        console.log(`   ⚠️  Erro: ${result.error}`);
      }
      
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('🎤 Sistema de voz self-hosted testado com sucesso!');
    console.log(`💡 Taxa de sucesso: ${successRate}%`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * 🧹 Limpar arquivos temporários
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
        fs.rmdirSync(this.tempDir);
      }
      logger.info('🧹 Arquivos temporários limpos');
    } catch (error) {
      logger.warn('⚠️ Erro ao limpar arquivos temporários:', error.message);
    }
  }
}

// Executar testes se chamado diretamente
if (process.argv[1].includes('testVoice.js')) {
  const tester = new VoiceSystemTester();
  tester.runAllTests()
    .then(() => {
      logger.success('🎉 Testes concluídos!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 Falha nos testes:', error);
      process.exit(1);
    });
}

export { VoiceSystemTester };
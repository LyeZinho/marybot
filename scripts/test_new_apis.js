#!/usr/bin/env node
/**
 * 🧪 Script de teste para as novas APIs LLM e Voice
 * Testa a integração com TinyLlama e OpenTTS
 */
import { externalLLMService } from '../src/utils/ExternalLLMService.js';
import { externalVoiceService } from '../src/utils/ExternalVoiceService.js';
import { logger } from '../src/utils/logger.js';
import { existsSync, statSync } from 'fs';

async function testLLMAPI() {
  console.log('\n🤖 === TESTANDO API LLM (TinyLlama) ===\n');
  
  try {
    // Teste de conectividade
    console.log('1. Testando conectividade...');
    const connectionTest = await externalLLMService.testConnection();
    console.log('   Resultado:', connectionTest);
    
    // Teste de geração de conversação
    console.log('\n2. Testando geração de conversação...');
    const conversationResult = await externalLLMService.generateConversation({
      prompt: 'Olá! Como você está hoje?',
      context: 'Você é um assistente amigável.',
      maxTokens: 50,
      userId: 'test-user'
    });
    
    console.log('   Resposta:', conversationResult.response);
    console.log('   Tokens:', conversationResult.tokens);
    console.log('   Source:', conversationResult.source);
    
    // Teste de análise de sentimento
    console.log('\n3. Testando análise de sentimento...');
    const sentimentResult = await externalLLMService.analyzeSentiment('Estou muito feliz hoje!');
    console.log('   Sentimento:', sentimentResult.sentiment);
    console.log('   Confiança:', sentimentResult.confidence);
    
    // Teste de análise de emoção
    console.log('\n4. Testando análise de emoção...');
    const emotionResult = await externalLLMService.analyzeEmotion('Estou com medo do resultado');
    console.log('   Emoção:', emotionResult.emotion);
    console.log('   Confiança:', emotionResult.confidence);
    
    // Status do serviço
    console.log('\n5. Status do serviço:');
    const llmStatus = externalLLMService.getStatus();
    console.log('   API URL:', llmStatus.apiUrl);
    console.log('   Max Tokens:', llmStatus.maxTokens);
    console.log('   Model:', llmStatus.model);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro no teste LLM:', error.message);
    return false;
  }
}

async function testVoiceAPI() {
  console.log('\n🗣️ === TESTANDO API VOICE (OpenTTS) ===\n');
  
  try {
    // Teste de conectividade
    console.log('1. Testando conectividade...');
    const connectionTest = await externalVoiceService.testConnection();
    console.log('   Conectado:', connectionTest.connected);
    if (connectionTest.audioPath) {
      const audioStat = statSync(connectionTest.audioPath);
      console.log('   Arquivo gerado:', connectionTest.audioPath);
      console.log('   Tamanho:', audioStat.size, 'bytes');
    }
    
    // Teste de síntese de voz
    console.log('\n2. Testando síntese de voz...');
    const ttsResult = await externalVoiceService.synthesizeText('Olá! Este é um teste do sistema de voz.', {
      voice: 'pt_BR-faber-medium',
      format: 'wav',
      useCache: false
    });
    
    if (ttsResult && existsSync(ttsResult)) {
      const audioStat = statSync(ttsResult);
      console.log('   ✅ Áudio gerado:', ttsResult);
      console.log('   Tamanho:', audioStat.size, 'bytes');
      console.log('   Modificado:', audioStat.mtime.toLocaleString());
    } else {
      console.log('   ❌ Falha ao gerar áudio');
    }
    
    // Teste de cache
    console.log('\n3. Testando cache...');
    const cachedResult = await externalVoiceService.synthesizeText('Olá! Este é um teste do sistema de voz.', {
      voice: 'pt_BR-faber-medium',
      format: 'wav',
      useCache: true
    });
    
    if (cachedResult && existsSync(cachedResult)) {
      console.log('   ✅ Cache funcionando:', cachedResult);
    }
    
    // Listar vozes disponíveis
    console.log('\n4. Vozes disponíveis:');
    const voices = await externalVoiceService.listAvailableVoices();
    voices.forEach(voice => console.log('   -', voice));
    
    // Status do serviço
    console.log('\n5. Status do serviço:');
    const voiceStatus = externalVoiceService.getStatus();
    console.log('   TTS API URL:', voiceStatus.ttsApiUrl);
    console.log('   Voz padrão:', voiceStatus.defaultVoice);
    console.log('   Formato padrão:', voiceStatus.defaultFormat);
    console.log('   STT suportado:', voiceStatus.sttSupported);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro no teste Voice:', error.message);
    return false;
  }
}

async function testIntegration() {
  console.log('\n🔗 === TESTANDO INTEGRAÇÃO ===\n');
  
  try {
    // Teste de fluxo completo: pergunta -> LLM -> TTS
    console.log('1. Fluxo completo: Pergunta -> LLM -> TTS');
    
    const userQuestion = 'Qual é a capital do Brasil?';
    console.log(`   Pergunta: "${userQuestion}"`);
    
    // Gerar resposta com LLM
    const llmResponse = await externalLLMService.generateConversation({
      prompt: userQuestion,
      context: 'Responda de forma breve e direta.',
      maxTokens: 50
    });
    
    console.log(`   Resposta LLM: "${llmResponse.response}"`);
    
    // Converter resposta para áudio
    const audioPath = await externalVoiceService.synthesizeText(llmResponse.response, {
      voice: 'pt_BR-faber-medium'
    });
    
    if (audioPath && existsSync(audioPath)) {
      const audioStat = statSync(audioPath);
      console.log('   ✅ Áudio gerado:', audioPath);
      console.log('   Tamanho:', audioStat.size, 'bytes');
      console.log('   🎉 Integração funcionando!');
      return true;
    } else {
      console.log('   ❌ Falha na geração de áudio');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de integração:', error.message);
    return false;
  }
}

async function run() {
  console.log('🧪 === TESTANDO NOVAS APIs LLM E VOICE ===');
  
  // Verificar variáveis de ambiente
  console.log('\n📋 Configuração:');
  console.log('   LLM_API_URL:', process.env.LLM_API_URL || 'http://homelab.op:10650/');
  console.log('   TTS_API_URL:', process.env.TTS_API_URL || 'http://homelab.op:5500/speech');
  console.log('   TTS_VOICE:', process.env.TTS_VOICE || 'pt_BR-faber-medium');
  
  let allPassed = true;
  
  // Executar testes
  const llmPassed = await testLLMAPI();
  const voicePassed = await testVoiceAPI();
  const integrationPassed = await testIntegration();
  
  allPassed = llmPassed && voicePassed && integrationPassed;
  
  // Resultado final
  console.log('\n📊 === RESULTADOS ===');
  console.log('   API LLM:', llmPassed ? '✅ PASSOU' : '❌ FALHOU');
  console.log('   API Voice:', voicePassed ? '✅ PASSOU' : '❌ FALHOU');
  console.log('   Integração:', integrationPassed ? '✅ PASSOU' : '❌ FALHOU');
  console.log('\n🎯 Resultado geral:', allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM');
  
  if (allPassed) {
    console.log('\n🚀 As APIs estão funcionando corretamente!');
    console.log('   Agora você pode usar o bot com as novas APIs LLM e Voice.');
  } else {
    console.log('\n🔧 Verifique:');
    console.log('   - Se as APIs estão rodando nos endereços corretos');
    console.log('   - Se as configurações de rede estão corretas');
    console.log('   - Se as dependências estão instaladas (axios)');
  }
  
  process.exit(allPassed ? 0 : 1);
}

run().catch(console.error);
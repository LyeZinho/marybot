/**
 * 🧪 Teste do Fluxo Completo: User Input → LLM → Text Processing → TTS → User Response
 */

import { externalLLMService } from '../src/utils/ExternalLLMService.js';
import { externalVoiceService } from '../src/utils/ExternalVoiceService.js';
import { logger } from '../src/utils/logger.js';

// Configurar logger para mostrar tudo no console
logger.level = 'info';

console.log('🧪 === TESTE DO FLUXO COMPLETO ===\n');

async function testCompleteFlow() {
  try {
    // 1️⃣ Input do usuário
    const userInput = "Olá! Como você está hoje?";
    console.log(`👤 Input do usuário: "${userInput}"`);
    
    // 2️⃣ Resposta do LLM
    console.log('\n🤖 Processando com LLM...');
    const llmResponse = await externalLLMService.generateConversation({
      prompt: userInput,
      context: 'Você é um assistente amigável. Responda de forma natural e concisa.',
      maxTokens: 100
    });
    
    console.log(`💭 Resposta do LLM: "${llmResponse.content}"`);
    console.log(`📊 Tokens: ${llmResponse.tokenCount}, Source: ${llmResponse.source}`);
    
    // 3️⃣ Tratamento de texto
    console.log('\n🔧 Processando texto...');
    let processedText = llmResponse.content;
    
    // Remover tokens de template se existirem
    processedText = processedText.replace(/<\|user\|>|<\|assistant\|>/g, '').trim();
    
    // Limitar tamanho para TTS
    if (processedText.length > 200) {
      processedText = processedText.substring(0, 200) + '...';
    }
    
    console.log(`✂️ Texto processado: "${processedText}"`);
    
    // 4️⃣ API TTS
    console.log('\n🗣️ Gerando áudio...');
    const audioPath = await externalVoiceService.synthesizeText(processedText, {
      voice: 'espeak:pt'
    });
    
    console.log(`🎵 Áudio gerado: ${audioPath}`);
    
    // 5️⃣ Resposta final para o usuário
    console.log('\n✅ Fluxo completo executado com sucesso!');
    console.log('📝 Resumo:');
    console.log(`   Input: ${userInput}`);
    console.log(`   LLM Response: ${llmResponse.content}`);
    console.log(`   Processed Text: ${processedText}`);
    console.log(`   Audio File: ${audioPath}`);
    
    return {
      success: true,
      userInput,
      llmResponse: llmResponse.content,
      processedText,
      audioPath
    };
    
  } catch (error) {
    console.error(`❌ Erro no fluxo: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testIndividualAPIs() {
  console.log('\n🔍 === TESTES INDIVIDUAIS ===\n');
  
  // Teste LLM API
  console.log('1️⃣ Testando API LLM...');
  try {
    const response = await fetch('http://homelab.op:10650/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Teste rápido' }],
        max_tokens: 50
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ LLM API OK: ${data.choices?.[0]?.message?.content || 'Response received'}`);
    } else {
      console.log(`❌ LLM API erro: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ LLM API erro: ${error.message}`);
  }
  
  // Teste TTS API
  console.log('\n2️⃣ Testando API TTS...');
  try {
    const testUrl = 'http://homelab.op:5500/api/tts?voice=glow-speak:en-us_mary_ann&text=Hello%20test';
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log(`✅ TTS API OK: ${audioBuffer.byteLength} bytes recebidos`);
    } else {
      console.log(`❌ TTS API erro: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ TTS API erro: ${error.message}`);
  }
}

// Executar testes
async function runAllTests() {
  await testIndividualAPIs();
  
  console.log('\n' + '='.repeat(50));
  const result = await testCompleteFlow();
  
  if (result.success) {
    console.log('\n🎯 RESULTADO: ✅ FLUXO COMPLETO FUNCIONANDO!');
    console.log('🚀 O sistema está pronto para uso com as APIs corretas.');
  } else {
    console.log('\n🎯 RESULTADO: ❌ FALHAS ENCONTRADAS');
    console.log(`🔧 Verifique: ${result.error}`);
  }
}

runAllTests().catch(console.error);
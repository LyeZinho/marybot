#!/usr/bin/env node
/**
 * 🧪 Teste Simples da Nova API de Voz
 */

import { externalVoiceService } from '../src/utils/ExternalVoiceService.js';

async function testSimpleVoice() {
  console.log('🧪 === TESTE DA NOVA API DE VOZ SIMPLES ===\n');
  
  try {
    // Teste 1: Conectividade
    console.log('1. 🔍 Testando conectividade...');
    const status = externalVoiceService.getStatus();
    console.log('   Configuração:', status);
    
    // Teste 2: Síntese básica
    console.log('\n2. 🗣️ Testando síntese com espeak:pt...');
    const audioPath1 = await externalVoiceService.synthesizeText('Olá, como vai?', {
      voice: 'espeak:pt'
    });
    console.log(`   ✅ Áudio 1: ${audioPath1}`);
    
    // Teste 3: Síntese com texto diferente
    console.log('\n3. 🗣️ Testando síntese com outro texto...');
    const audioPath2 = await externalVoiceService.synthesizeText('Este é um teste do novo sistema de voz', {
      voice: 'espeak:pt'
    });
    console.log(`   ✅ Áudio 2: ${audioPath2}`);
    
    // Teste 4: Conectividade formal
    console.log('\n4. 🌐 Testando conectividade formal...');
    const connTest = await externalVoiceService.testConnection();
    console.log('   Resultado:', connTest);
    
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ O novo sistema de voz está funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ ERRO no teste:', error.message);
    process.exit(1);
  }
}

testSimpleVoice();
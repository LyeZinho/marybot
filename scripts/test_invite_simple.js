/**
 * 🧪 Teste Simples do Sistema de Convites
 * Verifica se os módulos estão carregando corretamente
 */

console.log('🧪 === TESTE SIMPLES DO SISTEMA DE CONVITES ===\n');

async function simpleTest() {
  try {
    console.log('1️⃣ Testando imports...');
    
    // Testar imports básicos
    const { inviteSystem } = await import('../src/utils/inviteSystem.js');
    console.log('✅ InviteSystem carregado');
    
    // Testar métodos básicos
    console.log('\n2️⃣ Testando métodos básicos...');
    
    // Testar cálculo de fraude
    const testUser = {
      username: 'testuser',
      createdTimestamp: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 dias
      avatar: 'avatar123'
    };
    
    const fraudScore = inviteSystem.calculateFraudScore(testUser, {});
    console.log(`🔍 Score de fraude: ${fraudScore} (esperado: baixo)`);
    
    // Testar usuário suspeito
    const suspiciousUser = {
      username: '123456789',
      createdTimestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 dia
      avatar: null
    };
    
    const suspiciousScore = inviteSystem.calculateFraudScore(suspiciousUser, {});
    console.log(`🚨 Score suspeito: ${suspiciousScore} (esperado: alto)`);
    
    console.log('\n3️⃣ Testando status...');
    
    // Verificar se o sistema está inicializado
    if (inviteSystem) {
      console.log('✅ Sistema de convites inicializado corretamente');
    }
    
    console.log('\n✅ TESTE BÁSICO PASSOU!');
    console.log('🎯 O sistema de convites está carregando corretamente.');
    console.log('\nPara teste completo, execute após configurar o banco:');
    console.log('node scripts/test_invite_system.js');
    
  } catch (error) {
    console.error('\n❌ ERRO no teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

simpleTest().catch(console.error);
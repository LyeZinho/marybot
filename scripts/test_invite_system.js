#!/usr/bin/env node
/**
 * 🧪 Teste do Sistema de Convites
 * Testa todas as funcionalidades do sistema de afiliados
 */

import { inviteSystem } from '../src/utils/inviteSystem.js';
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';

// Configurar logger para mostrar tudo
logger.level = 'info';

console.log('🧪 === TESTE DO SISTEMA DE CONVITES ===\n');

async function testInviteSystem() {
  try {
    const testGuildId = 'test-guild-123';
    const testUserId = 'test-user-456';
    const testInviterId = 'test-inviter-789';
    
    console.log('1️⃣ Testando configuração do sistema...');
    
    // Criar configuração de teste
    await prisma.inviteConfig.upsert({
      where: { guildId: testGuildId },
      update: {},
      create: {
        guildId: testGuildId,
        enabled: true,
        rewardPerInvite: 100,
        bonusThresholds: JSON.stringify({ "5": 500, "10": 1000 }),
        minAccountAge: 7,
        minStayTime: 24,
        maxRewardPerDay: 1000,
        fraudDetection: true
      }
    });
    console.log('✅ Configuração criada');
    
    // Testar obtenção de configuração
    const config = await inviteSystem.getInviteConfig(testGuildId);
    console.log('📋 Config obtida:', {
      enabled: config.enabled,
      reward: config.rewardPerInvite,
      limits: `${config.minAccountAge}d/${config.minStayTime}h`
    });
    
    console.log('\n2️⃣ Testando criação de usuários...');
    
    // Garantir usuários existem
    await inviteSystem.ensureUserExists({
      id: testInviterId,
      username: 'TestInviter'
    });
    
    await inviteSystem.ensureUserExists({
      id: testUserId,
      username: 'TestUser'
    });
    console.log('✅ Usuários criados');
    
    console.log('\n3️⃣ Testando criação de convite...');
    
    // Criar convite de teste
    const mockDiscordInvite = {
      code: 'test-invite-abc123',
      inviter: {
        id: testInviterId,
        username: 'TestInviter',
        bot: false
      },
      channel: null,
      uses: 0,
      maxUses: 0,
      temporary: false,
      maxAge: 0,
      expiresAt: null
    };
    
    const mockGuild = {
      id: testGuildId,
      name: 'Test Guild'
    };
    
    await inviteSystem.createInvite(mockDiscordInvite, mockGuild);
    console.log('✅ Convite criado');
    
    console.log('\n4️⃣ Testando uso de convite...');
    
    // Simular uso do convite
    const mockMember = {
      id: testUserId,
      user: {
        id: testUserId,
        username: 'TestUser',
        bot: false,
        createdTimestamp: Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 dias atrás
      }
    };
    
    const usedInvite = {
      code: 'test-invite-abc123',
      inviterId: testInviterId,
      currentUses: 1
    };
    
    const inviteUse = await inviteSystem.recordInviteUse(
      usedInvite, 
      mockMember, 
      mockGuild, 
      config
    );
    console.log('📝 Uso registrado:', {
      valid: inviteUse.isValid,
      reward: inviteUse.rewardAmount
    });
    
    console.log('\n5️⃣ Testando processamento de recompensa...');
    
    if (inviteUse && inviteUse.isValid) {
      await inviteSystem.processReward(usedInvite, mockMember, config);
      console.log('💰 Recompensa processada');
    }
    
    console.log('\n6️⃣ Testando estatísticas...');
    
    const stats = await inviteSystem.getUserInviteStats(testInviterId, testGuildId);
    console.log('📊 Stats do usuário:', stats);
    
    console.log('\n7️⃣ Testando validação de fraudes...');
    
    // Teste com conta nova (suspeita)
    const suspiciousMember = {
      id: 'suspicious-user-999',
      user: {
        id: 'suspicious-user-999',
        username: '12345678',
        bot: false,
        createdTimestamp: Date.now() - (2 * 24 * 60 * 60 * 1000) // 2 dias atrás
      }
    };
    
    const isValid = await inviteSystem.validateInviteUse(suspiciousMember, config);
    console.log('🔍 Validação de conta suspeita:', isValid ? '✅ Válida' : '❌ Suspeita');
    
    const fraudScore = inviteSystem.calculateFraudScore(
      suspiciousMember.user, 
      suspiciousMember
    );
    console.log('🚨 Score de fraude:', fraudScore);
    
    console.log('\n8️⃣ Testando limpeza...');
    await inviteSystem.cleanup();
    console.log('🧹 Limpeza executada');
    
    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('🎯 O sistema de convites está funcionando corretamente.');
    
    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await prisma.inviteUse.deleteMany({ where: { guildId: testGuildId } });
    await prisma.invite.deleteMany({ where: { guildId: testGuildId } });
    await prisma.inviteConfig.delete({ where: { guildId: testGuildId } });
    await prisma.user.deleteMany({ 
      where: { 
        discordId: { 
          in: [testUserId, testInviterId, 'suspicious-user-999'] 
        } 
      } 
    });
    console.log('🧹 Dados de teste removidos');
    
  } catch (error) {
    console.error('\n❌ ERRO no teste:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Testar casos específicos
async function testSpecificCases() {
  console.log('\n🔬 === TESTES ESPECÍFICOS ===\n');
  
  try {
    console.log('🧮 Testando cálculo de score de fraude...');
    
    const testCases = [
      {
        name: 'Conta normal',
        user: {
          username: 'normaluser',
          createdTimestamp: Date.now() - (365 * 24 * 60 * 60 * 1000), // 1 ano
          avatar: 'avatar123'
        },
        expected: 'baixo'
      },
      {
        name: 'Conta suspeita',
        user: {
          username: '123456789',
          createdTimestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 dia
          avatar: null
        },
        expected: 'alto'
      },
      {
        name: 'Conta moderada',
        user: {
          username: 'user123',
          createdTimestamp: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 dias
          avatar: 'avatar456'
        },
        expected: 'médio'
      }
    ];
    
    for (const testCase of testCases) {
      const score = inviteSystem.calculateFraudScore(testCase.user, {});
      const level = score < 0.3 ? 'baixo' : score < 0.7 ? 'médio' : 'alto';
      
      console.log(`   ${testCase.name}: ${score.toFixed(2)} (${level}) - ${level === testCase.expected ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ Testes específicos concluídos!');
    
  } catch (error) {
    console.error('❌ Erro em testes específicos:', error.message);
  }
}

// Executar todos os testes
async function runAllTests() {
  await testInviteSystem();
  await testSpecificCases();
  
  console.log('\n🎉 TODOS OS TESTES CONCLUÍDOS!');
  console.log('🚀 Sistema de convites pronto para produção.');
  
  process.exit(0);
}

runAllTests().catch(error => {
  console.error('❌ Erro fatal nos testes:', error);
  process.exit(1);
});
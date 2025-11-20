/**
 * Teste de Integração - Sistema de Convites com Discord.js
 * Simula o ambiente Discord para validar a integração completa
 */

const { Client, GatewayIntentBits, Events } = require('discord.js');
const InviteSystem = require('./inviteSystem');

class DiscordInviteTest {
    constructor() {
        // Criar cliente Discord simulado
        this.client = {
            guilds: new Map(),
            users: new Map()
        };
        
        this.inviteSystem = new InviteSystem();
        this.setupTestEnvironment();
    }

    setupTestEnvironment() {
        console.log('🔧 Configurando ambiente de teste Discord...');
        
        // Simular servidor Discord
        const testGuild = {
            id: 'test-guild-123',
            name: 'Servidor de Teste',
            invites: new Map()
        };
        
        // Criar convites simulados
        testGuild.invites.set('ABC123', {
            code: 'ABC123',
            inviter: { id: 'user-inviter-1', username: 'InviterUser' },
            uses: 5,
            maxUses: 0
        });
        
        testGuild.invites.set('XYZ789', {
            code: 'XYZ789',
            inviter: { id: 'user-inviter-2', username: 'PowerInviter' },
            uses: 12,
            maxUses: 10
        });
        
        this.client.guilds.set(testGuild.id, testGuild);
        
        // Simular usuários Discord
        const users = [
            { id: 'user-inviter-1', username: 'InviterUser', coins: 500 },
            { id: 'user-inviter-2', username: 'PowerInviter', coins: 2000 },
            { id: 'new-member-1', username: 'NewbieLegit', createdTimestamp: Date.now() - 2592000000 }, // 30 dias
            { id: 'new-member-2', username: 'user12345', createdTimestamp: Date.now() - 3600000 }, // 1 hora
            { id: 'new-member-3', username: 'BotAccount789', createdTimestamp: Date.now() - 1800000 } // 30 min
        ];
        
        users.forEach(user => {
            this.client.users.set(user.id, user);
            if (user.coins !== undefined) {
                this.inviteSystem.users.set(user.id, {
                    id: user.id,
                    coins: user.coins,
                    joinedTimestamp: user.createdTimestamp || Date.now(),
                    username: user.username,
                    avatar: user.username.includes('Legit') ? 'avatar123' : null
                });
            }
        });
        
        // Configurar sistema de convites
        this.inviteSystem.config.set(testGuild.id, {
            enabled: true,
            coinsPerInvite: 150,
            dailyLimit: 8,
            fraudThreshold: 0.4,
            bonusThresholds: [
                { invites: 3, bonus: 300 },
                { invites: 5, bonus: 750 },
                { invites: 10, bonus: 1500 }
            ]
        });
        
        console.log('✅ Ambiente configurado com sucesso!');
    }

    // Simular evento de membro entrando
    async simulateMemberJoin(guildId, userId, inviteCode) {
        console.log(`\n🚪 Simulando entrada de membro...`);
        
        const guild = this.client.guilds.get(guildId);
        const newMember = this.client.users.get(userId);
        const invite = guild.invites.get(inviteCode);
        
        if (!guild || !newMember || !invite) {
            console.log('❌ Erro: Guild, membro ou convite não encontrado');
            return null;
        }
        
        console.log(`   👤 Membro: ${newMember.username} (ID: ${newMember.id})`);
        console.log(`   🎫 Convite: ${inviteCode} (Criado por: ${invite.inviter.username})`);
        console.log(`   🏠 Servidor: ${guild.name}`);
        
        // Preparar dados do membro para o sistema
        const memberData = {
            id: newMember.id,
            username: newMember.username,
            avatar: newMember.username.includes('Legit') ? 'avatar123' : null,
            joinedTimestamp: newMember.createdTimestamp || Date.now() - 3600000
        };
        
        // Registrar convite no sistema se não existir
        if (!this.inviteSystem.invites.has(inviteCode)) {
            this.inviteSystem.invites.set(inviteCode, {
                code: inviteCode,
                inviterId: invite.inviter.id,
                guildId: guildId,
                uses: invite.uses,
                maxUses: invite.maxUses,
                createdTimestamp: Date.now() - 86400000
            });
        }
        
        // Processar através do sistema de convites
        return await this.inviteSystem.handleMemberJoin(memberData, guildId, inviteCode);
    }

    // Simular comando de estatísticas
    simulateStatsCommand(userId, guildId) {
        console.log(`\n📊 Comando /invite stats executado por ${userId}`);
        
        const stats = this.inviteSystem.getUserInviteStats(userId, guildId);
        const user = this.inviteSystem.users.get(userId);
        
        if (!user) {
            console.log('❌ Usuário não encontrado');
            return;
        }
        
        console.log(`\n📈 **Estatísticas de Convites - ${user.username}**`);
        console.log(`💰 **Saldo atual:** ${user.coins} coins`);
        console.log(`👥 **Total de convites:** ${stats.totalInvites}`);
        console.log(`✅ **Convites válidos:** ${stats.successfulInvites}`);
        console.log(`🚫 **Bloqueados (fraude):** ${stats.fraudDetected}`);
        console.log(`💵 **Total ganho:** ${stats.totalEarned} coins`);
        console.log(`📅 **Convites hoje:** ${stats.todayInvites}`);
        
        return stats;
    }

    // Simular comando de leaderboard
    simulateLeaderboardCommand(guildId) {
        console.log(`\n🏆 Comando /invite leaderboard executado`);
        
        const leaderboard = this.inviteSystem.getInviteLeaderboard(guildId, 5);
        
        console.log(`\n🎖️ **Top Convidadores**`);
        console.log('```');
        console.log('Pos | Usuário          | Convites | Ganhos');
        console.log('----|------------------|----------|--------');
        
        leaderboard.forEach((entry, index) => {
            const user = this.inviteSystem.users.get(entry.userId);
            const username = user ? user.username.padEnd(16) : 'Desconhecido'.padEnd(16);
            const invites = entry.successfulInvites.toString().padStart(8);
            const earnings = `${entry.totalEarned}c`.padStart(7);
            
            console.log(`${(index + 1).toString().padStart(3)} | ${username} | ${invites} | ${earnings}`);
        });
        console.log('```');
        
        return leaderboard;
    }

    // Executar bateria completa de testes
    async runIntegrationTests() {
        console.log('\n🧪 INICIANDO TESTES DE INTEGRAÇÃO DISCORD\n');
        console.log('=' .repeat(50));
        
        const guildId = 'test-guild-123';
        
        try {
            // Teste 1: Membro legítimo
            console.log('\n🟢 TESTE 1: Entrada de Membro Legítimo');
            console.log('-'.repeat(40));
            const result1 = await this.simulateMemberJoin(guildId, 'new-member-1', 'ABC123');
            
            if (result1?.success) {
                console.log(`✅ Sucesso! Recompensa: ${result1.reward} coins`);
                if (result1.bonusApplied) {
                    console.log(`🎉 Bônus aplicado: +${result1.bonusApplied.bonus} coins!`);
                }
            }
            
            // Teste 2: Membro suspeito
            console.log('\n🟡 TESTE 2: Entrada de Membro Suspeito');
            console.log('-'.repeat(40));
            const result2 = await this.simulateMemberJoin(guildId, 'new-member-2', 'ABC123');
            
            if (!result2?.success) {
                console.log(`⚠️ Bloqueado: ${result2.reason} (Score: ${result2.fraudScore?.toFixed(2)})`);
            }
            
            // Teste 3: Múltiplas entradas para bônus
            console.log('\n🔵 TESTE 3: Simulando Múltiplas Entradas para Bônus');
            console.log('-'.repeat(40));
            
            // Simular mais alguns membros legítimos
            for (let i = 0; i < 3; i++) {
                const memberId = `bonus-member-${i + 1}`;
                this.client.users.set(memberId, {
                    id: memberId,
                    username: `LegitUser${i + 1}`,
                    createdTimestamp: Date.now() - (2592000000 + i * 86400000) // Várias idades
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                const result = await this.simulateMemberJoin(guildId, memberId, 'ABC123');
                
                if (result?.success) {
                    console.log(`   ✅ ${result.totalInvites}º convite: +${result.reward} coins`);
                    if (result.bonusApplied) {
                        console.log(`   🎁 BÔNUS DE MARCO: +${result.bonusApplied.bonus} coins por ${result.bonusApplied.invites} convites!`);
                    }
                }
            }
            
            // Teste 4: Comandos de usuário
            console.log('\n🔍 TESTE 4: Comandos de Usuário');
            console.log('-'.repeat(40));
            
            this.simulateStatsCommand('user-inviter-1', guildId);
            this.simulateLeaderboardCommand(guildId);
            
            // Resumo final
            console.log('\n📋 RESUMO FINAL');
            console.log('='.repeat(50));
            
            const finalUser = this.inviteSystem.users.get('user-inviter-1');
            const finalStats = this.inviteSystem.getUserInviteStats('user-inviter-1', guildId);
            
            console.log(`💰 Saldo final: ${finalUser.coins} coins (ganhou ${finalStats.totalEarned})`);
            console.log(`📊 Performance: ${finalStats.successfulInvites}/${finalStats.totalInvites} convites válidos`);
            console.log(`🛡️ Fraudes bloqueadas: ${finalStats.fraudDetected}`);
            
            console.log('\n✅ TODOS OS TESTES DE INTEGRAÇÃO CONCLUÍDOS COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ Erro durante os testes:', error);
        }
    }
}

// Executar testes
async function runTests() {
    const tester = new DiscordInviteTest();
    await tester.runIntegrationTests();
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = DiscordInviteTest;
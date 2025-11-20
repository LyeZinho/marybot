/**
 * Sistema de Convites/Afiliados - Versão de Teste Independente
 * Sistema completo de recompensas por convites com detecção de fraude
 */

class InviteSystem {
    constructor() {
        this.invites = new Map(); // Simula dados de convite
        this.uses = new Map(); // Simula dados de uso
        this.config = new Map(); // Simula configuração por servidor
        this.users = new Map(); // Simula dados de usuário
        
        // Configuração padrão
        this.defaultConfig = {
            enabled: true,
            coinsPerInvite: 100,
            dailyLimit: 10,
            fraudThreshold: 0.3,
            bonusThresholds: [
                { invites: 5, bonus: 500 },
                { invites: 10, bonus: 1000 },
                { invites: 25, bonus: 2500 },
                { invites: 50, bonus: 5000 }
            ]
        };
    }

    // Simula dados iniciais para teste
    initializeTestData() {
        // Configuração do servidor teste
        this.config.set('test-guild', { ...this.defaultConfig });
        
        // Usuários de teste
        this.users.set('user1', { 
            id: 'user1', 
            coins: 1000, 
            joinedTimestamp: Date.now() - 86400000, // 1 dia atrás
            username: 'TestUser1',
            avatar: 'avatar1'
        });
        
        this.users.set('user2', { 
            id: 'user2', 
            coins: 500, 
            joinedTimestamp: Date.now() - 3600000, // 1 hora atrás
            username: 'NewUser123',
            avatar: null
        });

        // Convites de teste
        this.invites.set('invite1', {
            code: 'invite1',
            inviterId: 'user1',
            guildId: 'test-guild',
            uses: 3,
            maxUses: 0,
            createdTimestamp: Date.now() - 86400000
        });

        console.log('✅ Dados de teste inicializados');
    }

    /**
     * Calcula pontuação de fraude (0-1, onde 1 = mais suspeito)
     */
    calculateFraudScore(newMember, inviter) {
        let score = 0;
        const factors = [];

        // 1. Idade da conta (peso: 0.3)
        const accountAge = Date.now() - newMember.joinedTimestamp;
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation < 1) {
            score += 0.3;
            factors.push('Conta muito nova (< 1 dia)');
        } else if (daysSinceCreation < 7) {
            score += 0.15;
            factors.push('Conta nova (< 7 dias)');
        }

        // 2. Padrão de nome suspeito (peso: 0.2)
        const suspiciousPatterns = [
            /^[A-Za-z]+\d+$/, // Letras seguidas de números
            /^\w{1,4}$/, // Muito curto
            /^user\d+/i, // user + números
            /^guest\d+/i // guest + números
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(newMember.username))) {
            score += 0.2;
            factors.push('Padrão de nome suspeito');
        }

        // 3. Sem avatar (peso: 0.1)
        if (!newMember.avatar) {
            score += 0.1;
            factors.push('Sem avatar personalizado');
        }

        // 4. Muitos convites do mesmo usuário no mesmo dia (peso: 0.3)
        const today = new Date().toDateString();
        const inviterUses = Array.from(this.uses.values())
            .filter(use => 
                use.inviterId === inviter.id && 
                new Date(use.joinedAt).toDateString() === today
            );
        
        if (inviterUses.length > 5) {
            score += 0.3;
            factors.push(`Muitos convites hoje (${inviterUses.length})`);
        } else if (inviterUses.length > 3) {
            score += 0.15;
            factors.push(`Vários convites hoje (${inviterUses.length})`);
        }

        // 5. Rápida sucessão de convites (peso: 0.1)
        if (inviterUses.length > 0) {
            const lastInvite = Math.max(...inviterUses.map(use => use.joinedAt));
            const timeDiff = Date.now() - lastInvite;
            
            if (timeDiff < 60000) { // Menos de 1 minuto
                score += 0.1;
                factors.push('Convites em rápida sucessão');
            }
        }

        return { score: Math.min(score, 1), factors };
    }

    /**
     * Processa recompensa por convite
     */
    async processReward(inviterId, guildId, fraudScore) {
        const config = this.config.get(guildId);
        if (!config?.enabled) return null;

        const user = this.users.get(inviterId);
        if (!user) return null;

        // Verificar se passou no threshold de fraude
        if (fraudScore.score > config.fraudThreshold) {
            console.log(`❌ Recompensa negada por suspeita de fraude (score: ${fraudScore.score.toFixed(2)})`);
            return {
                success: false,
                reason: 'fraud_detected',
                fraudScore: fraudScore.score,
                factors: fraudScore.factors
            };
        }

        // Verificar limite diário
        const today = new Date().toDateString();
        const todayUses = Array.from(this.uses.values())
            .filter(use => 
                use.inviterId === inviterId && 
                new Date(use.joinedAt).toDateString() === today &&
                use.rewardGiven
            ).length;

        if (todayUses >= config.dailyLimit) {
            console.log(`⚠️ Limite diário atingido (${todayUses}/${config.dailyLimit})`);
            return {
                success: false,
                reason: 'daily_limit_reached',
                limit: config.dailyLimit
            };
        }

        // Calcular recompensa
        let reward = config.coinsPerInvite;
        let bonusApplied = null;

        // Verificar bônus por marcos
        const totalInvites = Array.from(this.uses.values())
            .filter(use => use.inviterId === inviterId && use.rewardGiven).length;

        for (const threshold of config.bonusThresholds) {
            if (totalInvites + 1 === threshold.invites) {
                reward += threshold.bonus;
                bonusApplied = threshold;
                break;
            }
        }

        // Aplicar recompensa
        user.coins += reward;
        this.users.set(inviterId, user);

        console.log(`💰 Recompensa processada: ${reward} coins para ${inviterId}`);
        if (bonusApplied) {
            console.log(`🎉 Bônus de marco aplicado: +${bonusApplied.bonus} coins por ${bonusApplied.invites} convites!`);
        }

        return {
            success: true,
            reward,
            bonusApplied,
            newBalance: user.coins,
            totalInvites: totalInvites + 1,
            fraudScore: fraudScore.score
        };
    }

    /**
     * Simula entrada de novo membro
     */
    async handleMemberJoin(newMember, guildId, inviteCode) {
        console.log(`\n👋 Novo membro entrou: ${newMember.username} via convite ${inviteCode}`);

        const invite = this.invites.get(inviteCode);
        if (!invite) {
            console.log('❌ Convite não encontrado');
            return null;
        }

        const inviter = this.users.get(invite.inviterId);
        if (!inviter) {
            console.log('❌ Usuário que convidou não encontrado');
            return null;
        }

        // Calcular pontuação de fraude
        const fraudScore = this.calculateFraudScore(newMember, inviter);
        console.log(`🔍 Análise de fraude: ${(fraudScore.score * 100).toFixed(1)}% suspeito`);
        if (fraudScore.factors.length > 0) {
            console.log(`   Fatores: ${fraudScore.factors.join(', ')}`);
        }

        // Processar recompensa
        const result = await this.processReward(invite.inviterId, guildId, fraudScore);

        // Registrar uso do convite
        const useId = `use_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.uses.set(useId, {
            id: useId,
            inviteId: inviteCode,
            inviterId: invite.inviterId,
            userId: newMember.id,
            guildId,
            joinedAt: Date.now(),
            fraudScore: fraudScore.score,
            fraudFactors: fraudScore.factors,
            rewardGiven: result?.success || false,
            rewardAmount: result?.reward || 0
        });

        return result;
    }

    /**
     * Obtém estatísticas de um usuário
     */
    getUserInviteStats(userId, guildId) {
        const userUses = Array.from(this.uses.values())
            .filter(use => use.inviterId === userId && use.guildId === guildId);

        const totalInvites = userUses.length;
        const successfulInvites = userUses.filter(use => use.rewardGiven).length;
        const totalEarned = userUses.reduce((sum, use) => sum + (use.rewardAmount || 0), 0);
        const todayInvites = userUses.filter(use => 
            new Date(use.joinedAt).toDateString() === new Date().toDateString()
        ).length;

        return {
            totalInvites,
            successfulInvites,
            totalEarned,
            todayInvites,
            fraudDetected: totalInvites - successfulInvites
        };
    }

    /**
     * Obtém leaderboard de convites
     */
    getInviteLeaderboard(guildId, limit = 10) {
        const inviteStats = new Map();

        // Agrupar por usuário
        Array.from(this.uses.values())
            .filter(use => use.guildId === guildId)
            .forEach(use => {
                if (!inviteStats.has(use.inviterId)) {
                    inviteStats.set(use.inviterId, {
                        userId: use.inviterId,
                        totalInvites: 0,
                        successfulInvites: 0,
                        totalEarned: 0
                    });
                }
                
                const stats = inviteStats.get(use.inviterId);
                stats.totalInvites++;
                if (use.rewardGiven) {
                    stats.successfulInvites++;
                    stats.totalEarned += use.rewardAmount;
                }
            });

        // Ordenar por convites bem-sucedidos
        return Array.from(inviteStats.values())
            .sort((a, b) => b.successfulInvites - a.successfulInvites)
            .slice(0, limit);
    }

    /**
     * Testa cenários diversos
     */
    async runTests() {
        console.log('\n🧪 INICIANDO TESTES DO SISTEMA DE CONVITES\n');
        
        this.initializeTestData();

        // Teste 1: Convite legítimo
        console.log('\n--- Teste 1: Usuário Legítimo ---');
        await this.handleMemberJoin({
            id: 'new_user_1',
            username: 'RealUser',
            avatar: 'avatar123',
            joinedTimestamp: Date.now() - 2592000000 // 30 dias atrás
        }, 'test-guild', 'invite1');

        // Teste 2: Usuário suspeito (conta nova + nome suspeito)
        console.log('\n--- Teste 2: Usuário Suspeito ---');
        await this.handleMemberJoin({
            id: 'new_user_2',
            username: 'user123456',
            avatar: null,
            joinedTimestamp: Date.now() - 3600000 // 1 hora atrás
        }, 'test-guild', 'invite1');

        // Teste 3: Múltiplos convites rápidos
        console.log('\n--- Teste 3: Múltiplos Convites Rápidos ---');
        for (let i = 3; i <= 7; i++) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Pequeno delay
            await this.handleMemberJoin({
                id: `rapid_user_${i}`,
                username: `Guest${i}`,
                avatar: null,
                joinedTimestamp: Date.now() - 1800000 // 30 min atrás
            }, 'test-guild', 'invite1');
        }

        // Teste 4: Verificar estatísticas
        console.log('\n--- Estatísticas Finais ---');
        const stats = this.getUserInviteStats('user1', 'test-guild');
        console.log('📊 Estatísticas do user1:', stats);

        const leaderboard = this.getInviteLeaderboard('test-guild', 5);
        console.log('🏆 Leaderboard:');
        leaderboard.forEach((user, index) => {
            console.log(`   ${index + 1}. User ${user.userId}: ${user.successfulInvites} convites (${user.totalEarned} coins)`);
        });

        // Verificar saldo final
        const finalUser = this.users.get('user1');
        console.log(`💰 Saldo final do user1: ${finalUser.coins} coins`);

        console.log('\n✅ TODOS OS TESTES CONCLUÍDOS!');
    }
}

// Executar testes se for chamado diretamente
if (require.main === module) {
    const system = new InviteSystem();
    system.runTests().catch(console.error);
}

module.exports = InviteSystem;
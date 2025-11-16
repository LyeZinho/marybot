#!/usr/bin/env node

/**
 * Teste da API MaryBot AI
 * Testa todos os endpoints disponíveis
 */

const baseURL = 'http://localhost:3000/api';

console.log('🧪 Iniciando testes da API MaryBot AI...\n');

async function testAPI() {
    try {
        // Teste 1: Status da API
        console.log('📊 Testando /status...');
        const statusResponse = await fetch(`${baseURL}/status`);
        const statusData = await statusResponse.json();
        console.log('✅ Status:', JSON.stringify(statusData, null, 2));
        console.log();

        // Teste 2: Chat com IA
        console.log('🤖 Testando /chat...');
        const chatResponse = await fetch(`${baseURL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Olá! Como você está?',
                sessionId: 'test-session-123'
            })
        });
        const chatData = await chatResponse.json();
        console.log('✅ Chat:', JSON.stringify(chatData, null, 2));
        console.log();

        // Teste 3: Análise de Mood
        console.log('😊 Testando /mood...');
        const moodResponse = await fetch(`${baseURL}/mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Estou muito feliz hoje! O dia está lindo.',
                sessionId: 'test-session-123'
            })
        });
        const moodData = await moodResponse.json();
        console.log('✅ Mood:', JSON.stringify(moodData, null, 2));
        console.log();

        // Teste 4: Estatísticas
        console.log('📈 Testando /stats...');
        const statsResponse = await fetch(`${baseURL}/stats`);
        const statsData = await statsResponse.json();
        console.log('✅ Stats:', JSON.stringify(statsData, null, 2));
        console.log();

        console.log('🎉 Todos os testes concluídos com sucesso!');

    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Dica: Certifique-se de que o servidor está rodando na porta 3000');
        }
    }
}

testAPI();
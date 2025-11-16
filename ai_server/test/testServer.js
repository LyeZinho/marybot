import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const BASE_URL = 'http://localhost:3001';

class AIServerTester {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Executando teste: ${name}`);
      const startTime = Date.now();
      
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        status: 'PASSOU',
        duration,
        result
      });
      
      console.log(`✅ ${name} - ${duration}ms`);
      return result;
      
    } catch (error) {
      this.results.push({
        name,
        status: 'FALHOU',
        error: error.message
      });
      
      console.log(`❌ ${name} - ${error.message}`);
      throw error;
    }
  }

  async testHealthCheck() {
    return this.runTest('Health Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const data = await response.json();
      if (data.status !== 'healthy') throw new Error('Servidor não está saudável');
      
      return data;
    });
  }

  async testSimpleConversation() {
    return this.runTest('Conversação Simples', async () => {
      const response = await fetch(`${this.baseUrl}/api/conversation/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Olá! Como você está hoje?'
        })
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const data = await response.json();
      if (!data.success || !data.data.response) {
        throw new Error('Resposta inválida da API');
      }
      
      return data.data;
    });
  }

  async testSentimentAnalysis() {
    return this.runTest('Análise de Sentimento', async () => {
      const response = await fetch(`${this.baseUrl}/api/analysis/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Estou muito feliz hoje! O dia está lindo.'
        })
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const data = await response.json();
      if (!data.success) throw new Error('Análise falhou');
      
      return data.data;
    });
  }

  async testTextGeneration() {
    return this.runTest('Geração de Texto', async () => {
      const response = await fetch(`${this.baseUrl}/api/generation/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Era uma vez, em um reino distante',
          maxLength: 100,
          temperature: 0.8
        })
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const data = await response.json();
      if (!data.success || !data.data.generatedText) {
        throw new Error('Geração falhou');
      }
      
      return data.data;
    });
  }

  async testConversationFlow() {
    return this.runTest('Fluxo de Conversação', async () => {
      const messages = [
        { role: 'user', content: 'Oi, meu nome é João' },
        { role: 'assistant', content: 'Olá João! Prazer em conhecê-lo.' },
        { role: 'user', content: 'Qual é o meu nome?' }
      ];
      
      const response = await fetch(`${this.baseUrl}/api/conversation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const data = await response.json();
      if (!data.success) throw new Error('Conversação falhou');
      
      return data.data;
    });
  }

  async testRateLimit() {
    return this.runTest('Rate Limiting', async () => {
      const requests = [];
      
      // Fazer várias requisições rapidamente
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${this.baseUrl}/api/health`).then(r => r.status)
        );
      }
      
      const statuses = await Promise.all(requests);
      const successCount = statuses.filter(s => s === 200).length;
      
      if (successCount === 0) throw new Error('Todas as requisições falharam');
      
      return { successCount, totalRequests: requests.length };
    });
  }

  async testErrorHandling() {
    return this.runTest('Tratamento de Erros', async () => {
      // Teste com dados inválidos
      const response = await fetch(`${this.baseUrl}/api/conversation/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // prompt ausente intencionalmente
        })
      });
      
      if (response.status !== 400) {
        throw new Error(`Esperado status 400, recebido ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.error) throw new Error('Erro não foi retornado corretamente');
      
      return data;
    });
  }

  async runAllTests() {
    console.log('🚀 Iniciando testes do AI Server...\n');
    
    try {
      await this.testHealthCheck();
      await this.testSimpleConversation();
      await this.testSentimentAnalysis();
      await this.testTextGeneration();
      await this.testConversationFlow();
      await this.testRateLimit();
      await this.testErrorHandling();
      
    } catch (error) {
      console.log(`\n💥 Teste falhou: ${error.message}`);
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Resumo dos Testes:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASSOU').length;
    const failed = this.results.filter(r => r.status === 'FALHOU').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'PASSOU' ? '✅' : '❌';
      const duration = result.duration ? `(${result.duration}ms)` : '';
      console.log(`${icon} ${result.name} ${duration}`);
      
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
    });
    
    console.log('='.repeat(50));
    console.log(`Total: ${this.results.length} | Passou: ${passed} | Falhou: ${failed}`);
    
    if (failed === 0) {
      console.log('🎉 Todos os testes passaram!');
    } else {
      console.log(`⚠️  ${failed} teste(s) falharam`);
    }
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AIServerTester();
  tester.runAllTests().catch(console.error);
}

export default AIServerTester;
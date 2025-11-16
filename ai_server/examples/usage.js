// Exemplos de uso do AI Server
import fetch from 'node-fetch';

const AI_SERVER_URL = 'http://localhost:3001';

// Exemplo 1: Conversação simples
export async function exemploConversacaoSimples() {
  console.log('=== Exemplo: Conversação Simples ===');
  
  try {
    const response = await fetch(`${AI_SERVER_URL}/api/conversation/simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Olá! Me conte uma curiosidade interessante sobre o espaço.',
        options: {
          maxLength: 150,
          temperature: 0.8
        }
      })
    });
    
    const data = await response.json();
    console.log('Prompt:', data.data.prompt);
    console.log('Resposta:', data.data.response);
    console.log('---');
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Exemplo 2: Fluxo de conversação com contexto
export async function exemploFluxoConversacao() {
  console.log('=== Exemplo: Fluxo de Conversação ===');
  
  try {
    const messages = [
      { role: 'user', content: 'Meu nome é Maria e eu tenho 25 anos.' },
      { role: 'assistant', content: 'Olá Maria! Prazer em conhecê-la. Como posso ajudá-la hoje?' },
      { role: 'user', content: 'Qual é o meu nome e minha idade?' }
    ];
    
    const response = await fetch(`${AI_SERVER_URL}/api/conversation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    
    const data = await response.json();
    console.log('Contexto da conversação:');
    messages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.role}: ${msg.content}`);
    });
    console.log(`${messages.length + 1}. assistant: ${data.data.generatedText}`);
    console.log('---');
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Exemplo 3: Análise de sentimento
export async function exemploAnaliseSentimento() {
  console.log('=== Exemplo: Análise de Sentimento ===');
  
  const textos = [
    'Estou muito feliz com o resultado do projeto!',
    'Que dia horrível, nada deu certo hoje...',
    'O clima está agradável, nem quente nem frio.'
  ];
  
  for (const texto of textos) {
    try {
      const response = await fetch(`${AI_SERVER_URL}/api/analysis/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto })
      });
      
      const data = await response.json();
      const topResult = data.data.topResult;
      
      console.log(`Texto: "${texto}"`);
      console.log(`Sentimento: ${topResult.label} (${(topResult.score * 100).toFixed(1)}%)`);
      console.log('---');
      
    } catch (error) {
      console.error('Erro na análise:', error.message);
    }
  }
}

// Exemplo 4: Análise completa de texto
export async function exemploAnaliseCompleta() {
  console.log('=== Exemplo: Análise Completa ===');
  
  try {
    const texto = 'Adorei o filme de ontem! Foi uma experiência incrível, me senti muito emocionado com a história. Recomendo para todos os amigos.';
    
    const response = await fetch(`${AI_SERVER_URL}/api/analysis/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto })
    });
    
    const data = await response.json();
    const analysis = data.data;
    
    console.log(`Texto analisado: "${texto}"`);
    console.log(`Score geral: ${analysis.overallScore.toFixed(2)}`);
    console.log(`Recomendação: ${analysis.recommendation}`);
    
    if (analysis.analyses.sentiment.topResult) {
      const sent = analysis.analyses.sentiment.topResult;
      console.log(`Sentimento: ${sent.label} (${(sent.score * 100).toFixed(1)}%)`);
    }
    
    if (analysis.analyses.emotion.topResult) {
      const emo = analysis.analyses.emotion.topResult;
      console.log(`Emoção: ${emo.label} (${(emo.score * 100).toFixed(1)}%)`);
    }
    
    console.log('---');
    
  } catch (error) {
    console.error('Erro na análise:', error.message);
  }
}

// Exemplo 5: Geração de história
export async function exemploGeracaoHistoria() {
  console.log('=== Exemplo: Geração de História ===');
  
  try {
    const response = await fetch(`${AI_SERVER_URL}/api/generation/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'aventura em uma floresta mágica',
        characters: ['elfo corajoso', 'dragão amigável'],
        setting: 'floresta encantada',
        style: 'fantasy',
        length: 'short'
      })
    });
    
    const data = await response.json();
    const story = data.data;
    
    console.log(`Tema: ${story.theme}`);
    console.log(`Personagens: ${story.characters.join(', ')}`);
    console.log(`Ambientação: ${story.setting}`);
    console.log(`Palavras: ${story.wordCount}`);
    console.log('\nHistória:');
    console.log(story.story);
    console.log('---');
    
  } catch (error) {
    console.error('Erro na geração:', error.message);
  }
}

// Exemplo 6: Múltiplas variações de texto
export async function exemploVariacoes() {
  console.log('=== Exemplo: Variações de Texto ===');
  
  try {
    const response = await fetch(`${AI_SERVER_URL}/api/generation/variations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Dicas para ser mais produtivo no trabalho:',
        count: 3,
        maxLength: 100,
        diversityLevel: 'medium'
      })
    });
    
    const data = await response.json();
    const variations = data.data.variations;
    
    console.log('Prompt:', data.data.prompt);
    console.log('\nVariações geradas:');
    
    variations.forEach((variation, index) => {
      console.log(`\n${index + 1}. (temp: ${variation.temperature.toFixed(1)})`);
      console.log(variation.text);
    });
    
    console.log('---');
    
  } catch (error) {
    console.error('Erro na geração:', error.message);
  }
}

// Exemplo 7: Integração com Discord Bot
export class MaryBotAIIntegration {
  constructor(aiServerUrl = AI_SERVER_URL) {
    this.aiServerUrl = aiServerUrl;
  }
  
  async processMessage(userMessage, context = {}) {
    try {
      // Analisar sentimento primeiro
      const sentimentResponse = await fetch(`${this.aiServerUrl}/api/analysis/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage })
      });
      
      const sentimentData = await sentimentResponse.json();
      const sentiment = sentimentData.data.topResult;
      
      // Ajustar temperatura baseada no sentimento
      let temperature = 0.7;
      if (sentiment.label === 'POSITIVE') {
        temperature = 0.8; // Mais criativo para mensagens positivas
      } else if (sentiment.label === 'NEGATIVE') {
        temperature = 0.6; // Mais conservador para mensagens negativas
      }
      
      // Gerar resposta
      const conversationResponse = await fetch(`${this.aiServerUrl}/api/conversation/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          options: {
            maxLength: 200,
            temperature: temperature
          }
        })
      });
      
      const conversationData = await conversationResponse.json();
      
      return {
        response: conversationData.data.response,
        sentiment: sentiment,
        metadata: {
          temperature: temperature,
          analysisTime: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      return {
        response: 'Desculpe, não consegui processar sua mensagem no momento.',
        error: error.message
      };
    }
  }
}

// Função principal para executar exemplos
async function executarExemplos() {
  console.log('🤖 Executando exemplos do AI Server...\n');
  
  // Verificar se o servidor está rodando
  try {
    const healthResponse = await fetch(`${AI_SERVER_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('Servidor não está rodando');
    }
    console.log('✅ Servidor AI conectado\n');
  } catch (error) {
    console.error('❌ Erro: Certifique-se de que o servidor AI está rodando (npm start)');
    return;
  }
  
  // Executar exemplos
  await exemploConversacaoSimples();
  await exemploFluxoConversacao();
  await exemploAnaliseSentimento();
  await exemploAnaliseCompleta();
  await exemploGeracaoHistoria();
  await exemploVariacoes();
  
  // Exemplo de integração
  console.log('=== Exemplo: Integração com Bot ===');
  const integration = new MaryBotAIIntegration();
  const result = await integration.processMessage('Oi! Como você está hoje?');
  console.log('Resposta do bot:', result.response);
  console.log('Sentimento detectado:', result.sentiment.label);
  console.log('---');
  
  console.log('🎉 Todos os exemplos executados!');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarExemplos().catch(console.error);
}

export default {
  exemploConversacaoSimples,
  exemploFluxoConversacao,
  exemploAnaliseSentimento,
  exemploAnaliseCompleta,
  exemploGeracaoHistoria,
  exemploVariacoes,
  MaryBotAIIntegration
};
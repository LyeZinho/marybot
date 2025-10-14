import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (opcional - remova se não quiser resetar)
  console.log('🧹 Limpando dados existentes...');
  await prisma.animeQuote.deleteMany();
  await prisma.animeQuestion.deleteMany();
  await prisma.character.deleteMany();
  await prisma.item.deleteMany();

  // Seed de personagens
  console.log('🎭 Criando personagens...');
  const characters = [
    { name: 'Naruto Uzumaki', anime: 'Naruto', rarity: 3, attack: 85, defense: 70, luck: 90, description: 'O ninja número 1 mais hiperativo!' },
    { name: 'Sasuke Uchiha', anime: 'Naruto', rarity: 4, attack: 95, defense: 75, luck: 70, description: 'O último membro do clã Uchiha' },
    { name: 'Sakura Haruno', anime: 'Naruto', rarity: 3, attack: 75, defense: 80, luck: 85, description: 'Ninja médica poderosa' },
    { name: 'Luffy', anime: 'One Piece', rarity: 5, attack: 100, defense: 80, luck: 95, description: 'Futuro Rei dos Piratas!' },
    { name: 'Zoro', anime: 'One Piece', rarity: 4, attack: 98, defense: 85, luck: 60, description: 'Espadachim de três espadas' },
    { name: 'Nami', anime: 'One Piece', rarity: 3, attack: 65, defense: 70, luck: 95, description: 'Navegadora dos Piratas do Chapéu de Palha' },
    { name: 'Goku', anime: 'Dragon Ball Z', rarity: 5, attack: 100, defense: 90, luck: 85, description: 'O Super Saiyajin mais poderoso' },
    { name: 'Vegeta', anime: 'Dragon Ball Z', rarity: 4, attack: 97, defense: 88, luck: 65, description: 'Príncipe dos Saiyajins' },
    { name: 'Gohan', anime: 'Dragon Ball Z', rarity: 4, attack: 90, defense: 82, luck: 80, description: 'Filho de Goku com potencial infinito' },
    { name: 'Ichigo', anime: 'Bleach', rarity: 4, attack: 92, defense: 78, luck: 75, description: 'Shinigami substituto' },
    { name: 'Rukia', anime: 'Bleach', rarity: 3, attack: 80, defense: 85, luck: 70, description: 'Shinigami do 13º Esquadrão' },
    { name: 'Edward Elric', anime: 'Fullmetal Alchemist', rarity: 3, attack: 80, defense: 70, luck: 85, description: 'Alquimista de Aço' },
    { name: 'Alphonse Elric', anime: 'Fullmetal Alchemist', rarity: 3, attack: 75, defense: 95, luck: 75, description: 'Irmão mais novo dos Elric' },
    { name: 'Tanjiro Kamado', anime: 'Demon Slayer', rarity: 3, attack: 82, defense: 75, luck: 88, description: 'Caçador de demônios determinado' },
    { name: 'Nezuko Kamado', anime: 'Demon Slayer', rarity: 4, attack: 85, defense: 90, luck: 80, description: 'Demônio que protege humanos' },
    { name: 'Saitama', anime: 'One Punch Man', rarity: 5, attack: 100, defense: 100, luck: 50, description: 'Herói que vence tudo com um soco' },
    { name: 'Genos', anime: 'One Punch Man', rarity: 3, attack: 88, defense: 70, luck: 65, description: 'Cyborg discípulo de Saitama' },
    { name: 'Senku Ishigami', anime: 'Dr. Stone', rarity: 2, attack: 30, defense: 40, luck: 100, description: 'Gênio da ciência' },
    { name: 'Rimuru Tempest', anime: 'That Time I Got Reincarnated as a Slime', rarity: 5, attack: 98, defense: 95, luck: 90, description: 'Slime mais poderoso' },
    { name: 'Mob', anime: 'Mob Psycho 100', rarity: 4, attack: 95, defense: 60, luck: 80, description: 'Esper com poderes psíquicos' },
    { name: 'Natsu Dragneel', anime: 'Fairy Tail', rarity: 3, attack: 88, defense: 72, luck: 77, description: 'Dragon Slayer do fogo' },
    { name: 'Kirito', anime: 'Sword Art Online', rarity: 3, attack: 85, defense: 70, luck: 75, description: 'O Espadachim Negro' },
    { name: 'Asuna', anime: 'Sword Art Online', rarity: 3, attack: 83, defense: 75, luck: 82, description: 'A Relâmpago' },
    { name: 'Deku', anime: 'My Hero Academia', rarity: 4, attack: 90, defense: 70, luck: 85, description: 'Herói com One For All' },
    { name: 'All Might', anime: 'My Hero Academia', rarity: 5, attack: 100, defense: 85, luck: 80, description: 'Símbolo da Paz' }
  ];

  for (const character of characters) {
    await prisma.character.create({ data: character });
  }

  // Seed de citações de anime
  console.log('💬 Criando citações...');
  const quotes = [
    { quote: 'Eu irei me tornar o Hokage!', character: 'Naruto Uzumaki', anime: 'Naruto' },
    { quote: 'A vingança nunca cura a dor, só faz ela se espalhar.', character: 'Kakashi Hatake', anime: 'Naruto' },
    { quote: 'Eu vou ser o Rei dos Piratas!', character: 'Monkey D. Luffy', anime: 'One Piece' },
    { quote: 'Não importa o quão poderoso alguém se torna, uma pessoa não pode lutar sozinha.', character: 'Tanjiro Kamado', anime: 'Demon Slayer' },
    { quote: 'Plus Ultra!', character: 'All Might', anime: 'My Hero Academia' },
    { quote: 'O mundo não é perfeito, mas está aqui para nós, fazendo o melhor que pode.', character: 'Roy Mustang', anime: 'Fullmetal Alchemist' },
    { quote: 'Eu não sou um herói porque quero fama. Eu faço isso porque quero.', character: 'Saitama', anime: 'One Punch Man' },
    { quote: 'Se você não assumir riscos, não pode criar um futuro.', character: 'Monkey D. Luffy', anime: 'One Piece' },
    { quote: 'A força não vem da capacidade física. Vem da vontade indomável.', character: 'Piccolo', anime: 'Dragon Ball Z' },
    { quote: 'Às vezes você precisa de um pouco de wishful thinking para continuar.', character: 'Natsu Dragneel', anime: 'Fairy Tail' },
    { quote: 'Acredite em si mesmo. Não nas palavras dos outros.', character: 'Ichigo Kurosaki', anime: 'Bleach' },
    { quote: 'Para proteger algo, você deve dar algo em troca.', character: 'Edward Elric', anime: 'Fullmetal Alchemist' }
  ];

  for (const quote of quotes) {
    await prisma.animeQuote.create({ data: quote });
  }

  // Seed de perguntas de quiz
  console.log('❓ Criando perguntas de quiz...');
  const questions = [
    {
      question: 'Quem disse: "Eu irei me tornar o Hokage!"?',
      optionA: 'Naruto Uzumaki',
      optionB: 'Sasuke Uchiha',
      optionC: 'Sakura Haruno',
      optionD: 'Kakashi Hatake',
      correctAnswer: 'A',
      difficulty: 1,
      anime: 'Naruto',
      category: 'Citações'
    },
    {
      question: 'Qual é o nome da técnica especial do Luffy?',
      optionA: 'Rasengan',
      optionB: 'Gear Second',
      optionC: 'Kamehameha',
      optionD: 'Chidori',
      correctAnswer: 'B',
      difficulty: 2,
      anime: 'One Piece',
      category: 'Técnicas'
    },
    {
      question: 'Quantas Dragon Balls existem?',
      optionA: '5',
      optionB: '6',
      optionC: '7',
      optionD: '8',
      correctAnswer: 'C',
      difficulty: 1,
      anime: 'Dragon Ball',
      category: 'Objetos'
    },
    {
      question: 'Qual é o nome do irmão do Edward Elric?',
      optionA: 'Alphonse Elric',
      optionB: 'Roy Mustang',
      optionC: 'Winry Rockbell',
      optionD: 'Maes Hughes',
      correctAnswer: 'A',
      difficulty: 2,
      anime: 'Fullmetal Alchemist',
      category: 'Personagens'
    },
    {
      question: 'Em qual anime aparece o personagem "Rimuru Tempest"?',
      optionA: 'Overlord',
      optionB: 'That Time I Got Reincarnated as a Slime',
      optionC: 'Re:Zero',
      optionD: 'Konosuba',
      correctAnswer: 'B',
      difficulty: 3,
      anime: 'That Time I Got Reincarnated as a Slime',
      category: 'Isekai'
    }
  ];

  for (const question of questions) {
    await prisma.animeQuestion.create({ data: question });
  }

  // Seed de itens
  console.log('🛍️ Criando itens...');
  const items = [
    { name: 'Background Sunset', description: 'Um lindo fundo de pôr do sol para seu perfil', type: 'background', price: 500, rarity: 2 },
    { name: 'Badge Otaku', description: 'Badge que mostra seu amor por animes', type: 'badge', price: 200, rarity: 1 },
    { name: 'XP Boost x2', description: 'Dobra o XP ganho por 24 horas', type: 'boost', price: 1000, rarity: 3, effect: '{"type":"xp_boost","multiplier":2,"duration":86400}' },
    { name: 'Coin Boost x1.5', description: 'Aumenta ganho de moedas em 50% por 12 horas', type: 'boost', price: 750, rarity: 2, effect: '{"type":"coin_boost","multiplier":1.5,"duration":43200}' },
    { name: 'Background Ninja', description: 'Fundo temático de ninja para verdadeiros shinobi', type: 'background', price: 800, rarity: 3 },
    { name: 'Badge Collector', description: 'Para quem coleciona mais de 50 personagens', type: 'badge', price: 1500, rarity: 4 },
    { name: 'Title: Hokage', description: 'Título especial para líderes', type: 'title', price: 2000, rarity: 4 },
    { name: 'Daily Reset', description: 'Permite coletar daily novamente', type: 'consumable', price: 300, rarity: 2, effect: '{"type":"daily_reset"}' }
  ];

  for (const item of items) {
    await prisma.item.create({ data: item });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log(`📊 Criados:`);
  console.log(`   • ${characters.length} personagens`);
  console.log(`   • ${quotes.length} citações`);
  console.log(`   • ${questions.length} perguntas de quiz`);
  console.log(`   • ${items.length} itens`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro durante o seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
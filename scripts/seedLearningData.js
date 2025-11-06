import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../src/utils/embeddingService.js';
import { normalizeText } from '../src/utils/messageProcessor.js';

const prisma = new PrismaClient();

const sampleMessages = [
  // SAUDAÇÕES E DESPEDIDAS (15 mensagens)
  { content: 'oi bot, tudo bem?', category: 'greeting', authorId: '100000001', guildId: '900000001', channelId: '800000001' },
  { content: 'bom dia pessoal!', category: 'greeting', authorId: '100000002', guildId: '900000001', channelId: '800000001' },
  { content: 'boa tarde, como vocês estão?', category: 'greeting', authorId: '100000003', guildId: '900000001', channelId: '800000001' },
  { content: 'boa noite galera', category: 'greeting', authorId: '100000004', guildId: '900000001', channelId: '800000001' },
  { content: 'e aí pessoal, beleza?', category: 'greeting', authorId: '100000005', guildId: '900000001', channelId: '800000001' },
  { content: 'salve galera!', category: 'greeting', authorId: '100000006', guildId: '900000001', channelId: '800000001' },
  { content: 'oii, alguém online?', category: 'greeting', authorId: '100000007', guildId: '900000001', channelId: '800000001' },
  { content: 'opa, chegando agora', category: 'greeting', authorId: '100000008', guildId: '900000001', channelId: '800000001' },
  { content: 'tchau pessoal, até amanhã!', category: 'farewell', authorId: '100000009', guildId: '900000001', channelId: '800000001' },
  { content: 'até mais pessoal!', category: 'farewell', authorId: '100000010', guildId: '900000001', channelId: '800000001' },
  { content: 'flw galera, vou sair', category: 'farewell', authorId: '100000011', guildId: '900000001', channelId: '800000001' },
  { content: 'tenho que ir, até logo!', category: 'farewell', authorId: '100000012', guildId: '900000001', channelId: '800000001' },
  { content: 'vou dormir, boa noite!', category: 'farewell', authorId: '100000013', guildId: '900000001', channelId: '800000001' },
  { content: 'preciso sair, nos vemos depois', category: 'farewell', authorId: '100000014', guildId: '900000001', channelId: '800000001' },
  { content: 'saindo, até a próxima!', category: 'farewell', authorId: '100000015', guildId: '900000001', channelId: '800000001' },
  
  // ECONOMIA (25 mensagens)
  { content: 'como eu ganho moedas neste servidor?', category: 'economy', authorId: '100000016', guildId: '900000001', channelId: '800000002' },
  { content: 'qual o comando para ver meu saldo?', category: 'economy', authorId: '100000017', guildId: '900000001', channelId: '800000002' },
  { content: 'onde posso trabalhar para ganhar dinheiro?', category: 'economy', authorId: '100000018', guildId: '900000001', channelId: '800000002' },
  { content: 'quanto tempo demora o cooldown do trabalho?', category: 'economy', authorId: '100000019', guildId: '900000001', channelId: '800000002' },
  { content: 'posso transferir moedas para outros usuários?', category: 'economy', authorId: '100000020', guildId: '900000001', channelId: '800000002' },
  { content: 'o daily dá quantas moedas?', category: 'economy', authorId: '100000021', guildId: '900000001', channelId: '800000002' },
  { content: 'como faço para depositar moedas no banco?', category: 'economy', authorId: '100000022', guildId: '900000001', channelId: '800000002' },
  { content: 'existe limite no banco?', category: 'economy', authorId: '100000023', guildId: '900000001', channelId: '800000002' },
  { content: 'perco dinheiro se morrer?', category: 'economy', authorId: '100000024', guildId: '900000001', channelId: '800000002' },
  { content: 'quanto custa cada trabalho?', category: 'economy', authorId: '100000025', guildId: '900000001', channelId: '800000002' },
  { content: 'posso roubar moedas de alguém?', category: 'economy', authorId: '100000026', guildId: '900000001', channelId: '800000002' },
  { content: 'já tenho 50000 moedas guardadas!', category: 'economy', authorId: '100000027', guildId: '900000001', channelId: '800000002' },
  { content: 'qual trabalho paga melhor?', category: 'economy', authorId: '100000028', guildId: '900000001', channelId: '800000002' },
  { content: 'como funciona o sistema de streak do daily?', category: 'economy', authorId: '100000029', guildId: '900000001', channelId: '800000002' },
  { content: 'posso comprar itens com moedas?', category: 'economy', authorId: '100000030', guildId: '900000001', channelId: '800000002' },
  { content: 'existe alguma loja no bot?', category: 'economy', authorId: '100000031', guildId: '900000001', channelId: '800000002' },
  { content: 'como vejo o ranking de mais ricos?', category: 'economy', authorId: '100000032', guildId: '900000001', channelId: '800000002' },
  { content: 'dá para apostar moedas em algum jogo?', category: 'economy', authorId: '100000033', guildId: '900000001', channelId: '800000002' },
  { content: 'qual o valor máximo que posso ter?', category: 'economy', authorId: '100000034', guildId: '900000001', channelId: '800000002' },
  { content: 'posso vender meus itens por moedas?', category: 'economy', authorId: '100000035', guildId: '900000001', channelId: '800000002' },
  { content: 'como funciona o crime? é arriscado?', category: 'economy', authorId: '100000036', guildId: '900000001', channelId: '800000002' },
  { content: 'existe taxa para transferências?', category: 'economy', authorId: '100000037', guildId: '900000001', channelId: '800000002' },
  { content: 'perdi tudo apostando, como recupero?', category: 'economy', authorId: '100000038', guildId: '900000001', channelId: '800000002' },
  { content: 'quanto tempo para ficar rico?', category: 'economy', authorId: '100000039', guildId: '900000001', channelId: '800000002' },
  { content: 'vale a pena guardar dinheiro no banco?', category: 'economy', authorId: '100000040', guildId: '900000001', channelId: '800000002' },
  
  // DUNGEONS E COMBATE (25 mensagens)
  { content: 'como funcionam as dungeons neste bot?', category: 'dungeon', authorId: '100000041', guildId: '900000001', channelId: '800000003' },
  { content: 'qual a dificuldade recomendada para iniciantes?', category: 'dungeon', authorId: '100000042', guildId: '900000001', channelId: '800000003' },
  { content: 'preciso de uma party para entrar na dungeon?', category: 'dungeon', authorId: '100000043', guildId: '900000001', channelId: '800000003' },
  { content: 'quais são os melhores itens para dungeon?', category: 'dungeon', authorId: '100000044', guildId: '900000001', channelId: '800000003' },
  { content: 'morri na dungeon e perdi tudo, é normal?', category: 'dungeon', authorId: '100000045', guildId: '900000001', channelId: '800000003' },
  { content: 'quanto de HP eu preciso para dungeon média?', category: 'dungeon', authorId: '100000046', guildId: '900000001', channelId: '800000003' },
  { content: 'quais são os bosses de cada dungeon?', category: 'dungeon', authorId: '100000047', guildId: '900000001', channelId: '800000003' },
  { content: 'como aumento meus status de combate?', category: 'dungeon', authorId: '100000048', guildId: '900000001', channelId: '800000003' },
  { content: 'existe limite de dungeons por dia?', category: 'dungeon', authorId: '100000049', guildId: '900000001', channelId: '800000003' },
  { content: 'qual classe é melhor para solo?', category: 'dungeon', authorId: '100000050', guildId: '900000001', channelId: '800000003' },
  { content: 'como funciona o sistema de loot?', category: 'dungeon', authorId: '100000051', guildId: '900000001', channelId: '800000003' },
  { content: 'itens lendários são muito raros?', category: 'dungeon', authorId: '100000052', guildId: '900000001', channelId: '800000003' },
  { content: 'posso reviver se morrer na dungeon?', category: 'dungeon', authorId: '100000053', guildId: '900000001', channelId: '800000003' },
  { content: 'quanto XP eu ganho em cada dungeon?', category: 'dungeon', authorId: '100000054', guildId: '900000001', channelId: '800000003' },
  { content: 'qual o level mínimo para dungeon difícil?', category: 'dungeon', authorId: '100000055', guildId: '900000001', channelId: '800000003' },
  { content: 'como equipo itens antes de entrar?', category: 'dungeon', authorId: '100000056', guildId: '900000001', channelId: '800000003' },
  { content: 'dá para sair da dungeon no meio?', category: 'dungeon', authorId: '100000057', guildId: '900000001', channelId: '800000003' },
  { content: 'quantas salas tem cada dungeon?', category: 'dungeon', authorId: '100000058', guildId: '900000001', channelId: '800000003' },
  { content: 'tem armadilhas nas dungeons?', category: 'dungeon', authorId: '100000059', guildId: '900000001', channelId: '800000003' },
  { content: 'posso escolher meu caminho na dungeon?', category: 'dungeon', authorId: '100000060', guildId: '900000001', channelId: '800000003' },
  { content: 'como funciona defesa e ataque?', category: 'dungeon', authorId: '100000061', guildId: '900000001', channelId: '800000003' },
  { content: 'velocidade influencia em quê?', category: 'dungeon', authorId: '100000062', guildId: '900000001', channelId: '800000003' },
  { content: 'sorte aumenta chance de loot?', category: 'dungeon', authorId: '100000063', guildId: '900000001', channelId: '800000003' },
  { content: 'tem cooldown para entrar em dungeon?', category: 'dungeon', authorId: '100000064', guildId: '900000001', channelId: '800000003' },
  { content: 'posso farmar a mesma dungeon várias vezes?', category: 'dungeon', authorId: '100000065', guildId: '900000001', channelId: '800000003' },
  
  // AJUDA E COMANDOS (20 mensagens)
  { content: 'como eu uso este bot?', category: 'help', authorId: '100000066', guildId: '900000001', channelId: '800000004' },
  { content: 'quais são todos os comandos disponíveis?', category: 'help', authorId: '100000067', guildId: '900000001', channelId: '800000004' },
  { content: 'não entendi como usar o comando de inventário', category: 'help', authorId: '100000068', guildId: '900000001', channelId: '800000004' },
  { content: 'onde posso ver meu perfil completo?', category: 'help', authorId: '100000069', guildId: '900000001', channelId: '800000004' },
  { content: 'qual o prefixo dos comandos?', category: 'help', authorId: '100000070', guildId: '900000001', channelId: '800000004' },
  { content: 'tem comandos de admin?', category: 'help', authorId: '100000071', guildId: '900000001', channelId: '800000004' },
  { content: 'como vejo a lista de comandos?', category: 'help', authorId: '100000072', guildId: '900000001', channelId: '800000004' },
  { content: 'existe documentação do bot?', category: 'help', authorId: '100000073', guildId: '900000001', channelId: '800000004' },
  { content: 'como reporto um bug?', category: 'help', authorId: '100000074', guildId: '900000001', channelId: '800000004' },
  { content: 'o bot não respondeu meu comando', category: 'help', authorId: '100000075', guildId: '900000001', channelId: '800000004' },
  { content: 'tem tutorial para iniciantes?', category: 'help', authorId: '100000076', guildId: '900000001', channelId: '800000004' },
  { content: 'como funciona o sistema de níveis?', category: 'help', authorId: '100000077', guildId: '900000001', channelId: '800000004' },
  { content: 'posso sugerir novos recursos?', category: 'help', authorId: '100000078', guildId: '900000001', channelId: '800000004' },
  { content: 'o bot está offline?', category: 'help', authorId: '100000079', guildId: '900000001', channelId: '800000004' },
  { content: 'como configuro o bot no meu servidor?', category: 'help', authorId: '100000080', guildId: '900000001', channelId: '800000004' },
  { content: 'existe servidor de suporte?', category: 'help', authorId: '100000081', guildId: '900000001', channelId: '800000004' },
  { content: 'quais permissões o bot precisa?', category: 'help', authorId: '100000082', guildId: '900000001', channelId: '800000004' },
  { content: 'como atualizo meu perfil?', category: 'help', authorId: '100000083', guildId: '900000001', channelId: '800000004' },
  { content: 'posso resetar meu progresso?', category: 'help', authorId: '100000084', guildId: '900000001', channelId: '800000004' },
  { content: 'tem comandos slash ou só prefixo?', category: 'help', authorId: '100000085', guildId: '900000001', channelId: '800000004' },
  
  // AGRADECIMENTOS E ELOGIOS (15 mensagens)
  { content: 'muito obrigado pela ajuda!', category: 'thanks', authorId: '100000086', guildId: '900000001', channelId: '800000001' },
  { content: 'valeu pessoal, ajudou muito', category: 'thanks', authorId: '100000087', guildId: '900000001', channelId: '800000001' },
  { content: 'esse bot é incrível, parabéns!', category: 'thanks', authorId: '100000088', guildId: '900000001', channelId: '800000001' },
  { content: 'obrigado bot, você é demais!', category: 'thanks', authorId: '100000089', guildId: '900000001', channelId: '800000001' },
  { content: 'adorei o sistema de economia', category: 'thanks', authorId: '100000090', guildId: '900000001', channelId: '800000001' },
  { content: 'melhor bot que já usei!', category: 'thanks', authorId: '100000091', guildId: '900000001', channelId: '800000001' },
  { content: 'muito obrigado pela explicação', category: 'thanks', authorId: '100000092', guildId: '900000001', channelId: '800000001' },
  { content: 'valeu mesmo, me salvou!', category: 'thanks', authorId: '100000093', guildId: '900000001', channelId: '800000001' },
  { content: 'que bot foda, mano!', category: 'thanks', authorId: '100000094', guildId: '900000001', channelId: '800000001' },
  { content: 'agradeço a ajuda de vocês', category: 'thanks', authorId: '100000095', guildId: '900000001', channelId: '800000001' },
  { content: 'muito bom esse servidor!', category: 'thanks', authorId: '100000096', guildId: '900000001', channelId: '800000001' },
  { content: 'parabéns pelo trabalho!', category: 'thanks', authorId: '100000097', guildId: '900000001', channelId: '800000001' },
  { content: 'esse bot tá sensacional', category: 'thanks', authorId: '100000098', guildId: '900000001', channelId: '800000001' },
  { content: 'obrigado por criar isso!', category: 'thanks', authorId: '100000099', guildId: '900000001', channelId: '800000001' },
  { content: 'valeu galera, comunidade top!', category: 'thanks', authorId: '100000100', guildId: '900000001', channelId: '800000001' },
  
  // CONVERSAS GERAIS E SOCIALIZAÇÃO (20 mensagens)
  { content: 'alguém online para conversar?', category: 'general', authorId: '100000101', guildId: '900000001', channelId: '800000001' },
  { content: 'esse servidor está muito legal', category: 'general', authorId: '100000102', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém quer fazer uma party?', category: 'general', authorId: '100000103', guildId: '900000001', channelId: '800000001' },
  { content: 'to entediado, vamos jogar algo?', category: 'general', authorId: '100000104', guildId: '900000001', channelId: '800000001' },
  { content: 'quanto tempo vocês jogam aqui?', category: 'general', authorId: '100000105', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém quer fazer amizade?', category: 'general', authorId: '100000106', guildId: '900000001', channelId: '800000001' },
  { content: 'que horas vocês costumam jogar?', category: 'general', authorId: '100000107', guildId: '900000001', channelId: '800000001' },
  { content: 'vamos criar um grupo de farm?', category: 'general', authorId: '100000108', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém joga outros jogos também?', category: 'general', authorId: '100000109', guildId: '900000001', channelId: '800000001' },
  { content: 'servidor ta crescendo legal!', category: 'general', authorId: '100000110', guildId: '900000001', channelId: '800000001' },
  { content: 'quem é o mais rico aqui?', category: 'general', authorId: '100000111', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém já zerou todas dungeons?', category: 'general', authorId: '100000112', guildId: '900000001', channelId: '800000001' },
  { content: 'to começando agora, sejam pacientes', category: 'general', authorId: '100000113', guildId: '900000001', channelId: '800000001' },
  { content: 'esse jogo vicia demais', category: 'general', authorId: '100000114', guildId: '900000001', channelId: '800000001' },
  { content: 'faz quanto tempo que o bot existe?', category: 'general', authorId: '100000115', guildId: '900000001', channelId: '800000001' },
  { content: 'tem muita gente ativa aqui?', category: 'general', authorId: '100000116', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém pode me adicionar?', category: 'general', authorId: '100000117', guildId: '900000001', channelId: '800000001' },
  { content: 'vamos fazer uma competição?', category: 'general', authorId: '100000118', guildId: '900000001', channelId: '800000001' },
  { content: 'adorei conhecer esse servidor', category: 'general', authorId: '100000119', guildId: '900000001', channelId: '800000001' },
  { content: 'galera aqui é muito gente boa', category: 'general', authorId: '100000120', guildId: '900000001', channelId: '800000001' },
  
  // ESTRATÉGIAS E DICAS (20 mensagens)
  { content: 'qual a melhor estratégia para ganhar moedas rápido?', category: 'strategy', authorId: '100000121', guildId: '900000001', channelId: '800000005' },
  { content: 'é melhor vender itens comuns ou guardar?', category: 'strategy', authorId: '100000122', guildId: '900000001', channelId: '800000005' },
  { content: 'devo focar em level ou em juntar dinheiro?', category: 'strategy', authorId: '100000123', guildId: '900000001', channelId: '800000005' },
  { content: 'qual build é melhor para PvE?', category: 'strategy', authorId: '100000124', guildId: '900000001', channelId: '800000005' },
  { content: 'compensa gastar moedas em itens caros?', category: 'strategy', authorId: '100000125', guildId: '900000001', channelId: '800000005' },
  { content: 'dica: sempre guardem dinheiro no banco!', category: 'strategy', authorId: '100000126', guildId: '900000001', channelId: '800000005' },
  { content: 'melhor upar defesa ou ataque primeiro?', category: 'strategy', authorId: '100000127', guildId: '900000001', channelId: '800000005' },
  { content: 'vale a pena trocar de classe?', category: 'strategy', authorId: '100000128', guildId: '900000001', channelId: '800000005' },
  { content: 'como otimizo meu farm de XP?', category: 'strategy', authorId: '100000129', guildId: '900000001', channelId: '800000005' },
  { content: 'qual a ordem ideal de dungeons?', category: 'strategy', authorId: '100000130', guildId: '900000001', channelId: '800000005' },
  { content: 'devo sempre fazer o daily?', category: 'strategy', authorId: '100000131', guildId: '900000001', channelId: '800000005' },
  { content: 'quando começo a fazer dungeons?', category: 'strategy', authorId: '100000132', guildId: '900000001', channelId: '800000005' },
  { content: 'investir em velocidade vale a pena?', category: 'strategy', authorId: '100000133', guildId: '900000001', channelId: '800000005' },
  { content: 'qual a meta de moedas para iniciantes?', category: 'strategy', authorId: '100000134', guildId: '900000001', channelId: '800000005' },
  { content: 'tem algum segredo para ficar forte rápido?', category: 'strategy', authorId: '100000135', guildId: '900000001', channelId: '800000005' },
  { content: 'melhor farmar sozinho ou em grupo?', category: 'strategy', authorId: '100000136', guildId: '900000001', channelId: '800000005' },
  { content: 'quanto devo ter de HP no level 10?', category: 'strategy', authorId: '100000137', guildId: '900000001', channelId: '800000005' },
  { content: 'priorizar HP ou dano?', category: 'strategy', authorId: '100000138', guildId: '900000001', channelId: '800000005' },
  { content: 'itens raros valem o preço?', category: 'strategy', authorId: '100000139', guildId: '900000001', channelId: '800000005' },
  { content: 'como monto uma build equilibrada?', category: 'strategy', authorId: '100000140', guildId: '900000001', channelId: '800000005' },
  
  // CONQUISTAS E CELEBRAÇÕES (15 mensagens)
  { content: 'consegui chegar no nível 10!', category: 'achievement', authorId: '100000141', guildId: '900000001', channelId: '800000001' },
  { content: 'dropou um item lendário na dungeon!', category: 'achievement', authorId: '100000142', guildId: '900000001', channelId: '800000003' },
  { content: 'finalmente juntei 10000 moedas', category: 'achievement', authorId: '100000143', guildId: '900000001', channelId: '800000002' },
  { content: 'zerei a dungeon difícil pela primeira vez!', category: 'achievement', authorId: '100000144', guildId: '900000001', channelId: '800000003' },
  { content: 'cheguei no top 10 do servidor!', category: 'achievement', authorId: '100000145', guildId: '900000001', channelId: '800000001' },
  { content: 'consegui meu primeiro item épico!', category: 'achievement', authorId: '100000146', guildId: '900000001', channelId: '800000003' },
  { content: 'daily streak de 30 dias!', category: 'achievement', authorId: '100000147', guildId: '900000001', channelId: '800000002' },
  { content: 'finalmente level 20!', category: 'achievement', authorId: '100000148', guildId: '900000001', channelId: '800000001' },
  { content: 'completei todas as dungeons!', category: 'achievement', authorId: '100000149', guildId: '900000001', channelId: '800000003' },
  { content: 'tenho 100k moedas guardadas', category: 'achievement', authorId: '100000150', guildId: '900000001', channelId: '800000002' },
  { content: 'derrotei o boss sem tomar dano!', category: 'achievement', authorId: '100000151', guildId: '900000001', channelId: '800000003' },
  { content: 'sou o mais rico do servidor agora!', category: 'achievement', authorId: '100000152', guildId: '900000001', channelId: '800000002' },
  { content: 'consegui todos os itens raros!', category: 'achievement', authorId: '100000153', guildId: '900000001', channelId: '800000003' },
  { content: 'upei todos meus status ao máximo!', category: 'achievement', authorId: '100000154', guildId: '900000001', channelId: '800000001' },
  { content: 'primeira vez que ganho num crime!', category: 'achievement', authorId: '100000155', guildId: '900000001', channelId: '800000002' },
  
  // DÚVIDAS E CONFUSÕES (10 mensagens)
  { content: 'não entendi como isso funciona', category: 'confusion', authorId: '100000156', guildId: '900000001', channelId: '800000001' },
  { content: 'isso está muito complicado para mim', category: 'confusion', authorId: '100000157', guildId: '900000001', channelId: '800000001' },
  { content: 'pode explicar de novo?', category: 'confusion', authorId: '100000158', guildId: '900000001', channelId: '800000001' },
  { content: 'to confuso com esses comandos', category: 'confusion', authorId: '100000159', guildId: '900000001', channelId: '800000001' },
  { content: 'não sei por onde começar', category: 'confusion', authorId: '100000160', guildId: '900000001', channelId: '800000001' },
  { content: 'alguém pode me ajudar? to perdido', category: 'confusion', authorId: '100000161', guildId: '900000001', channelId: '800000001' },
  { content: 'qual a diferença entre banco e carteira?', category: 'confusion', authorId: '100000162', guildId: '900000001', channelId: '800000002' },
  { content: 'não achei onde vejo meu inventário', category: 'confusion', authorId: '100000163', guildId: '900000001', channelId: '800000004' },
  { content: 'como funciona mesmo o sistema de XP?', category: 'confusion', authorId: '100000164', guildId: '900000001', channelId: '800000001' },
  { content: 'fiquei na dúvida sobre as classes', category: 'confusion', authorId: '100000165', guildId: '900000001', channelId: '800000003' }
];

async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados\n');

    console.log('🗑️  Limpando dados antigos...');
    await prisma.messageMemory.deleteMany({
      where: { guildId: '900000001' }
    });

    let successCount = 0;
    let errorCount = 0;

    console.log(`📝 Processando ${sampleMessages.length} mensagens...\n`);

    for (const msg of sampleMessages) {
      try {
        const normalized = normalizeText(msg.content);
        const embedding = await generateEmbedding(normalized);

        await prisma.messageMemory.create({
          data: {
            guildId: msg.guildId,
            channelId: msg.channelId,
            authorId: msg.authorId,
            authorName: `User${msg.authorId.slice(-3)}`,
            content: normalized,
            originalContent: msg.content,
            embedding: JSON.stringify(embedding),
            relevance: 1.0,
            reactions: 0,
            mentions: 0,
            wordCount: msg.content.split(' ').length,
            sentiment: 'NEUTRAL',
            topics: JSON.stringify([msg.category])
          }
        });

        successCount++;
        process.stdout.write(`✅ ${successCount}/${sampleMessages.length}\r`);

      } catch (error) {
        errorCount++;
        console.error(`\n❌ Erro: "${msg.content}"`);
      }
    }

    console.log(`\n\n✨ Seed concluído!`);
    console.log(`   Sucesso: ${successCount} | Erros: ${errorCount}\n`);

    const categories = {};
    sampleMessages.forEach(m => {
      categories[m.category] = (categories[m.category] || 0) + 1;
    });
    
    console.log('📊 Por categoria:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   • ${cat}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Desconectado');
  }
}

seedDatabase()
  .then(() => {
    console.log('\n🎉 Concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro:', error);
    process.exit(1);
  });

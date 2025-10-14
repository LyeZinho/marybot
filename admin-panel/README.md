# 🎮 MaryBot Admin Panel

Interface administrativa moderna para gerenciamento do MaryBot - Sistema completo de monitoramento e administração para o bot Discord de comunidade anime.

![Next.js](https://img.shields.io/badge/next.js-14-black)
![React](https://img.shields.io/badge/react-18-blue)
![Tailwind CSS](https://img.shields.io/badge/tailwind-3.3-cyan)
![TypeScript](https://img.shields.io/badge/typescript-ready-blue)

## ✨ Funcionalidades

### 📊 Dashboard Principal
- **Estatísticas em Tempo Real**: Usuários ativos, comandos executados, economia
- **Gráficos Interativos**: Crescimento de usuários, uso de comandos, atividade
- **Monitoramento de Sistema**: Status dos serviços, uptime, saúde do sistema
- **Atividade Recente**: Feed de eventos em tempo real via WebSocket

### 👥 Gerenciamento de Usuários
- **CRUD Completo**: Criar, visualizar, editar e excluir usuários
- **Filtros Avançados**: Busca por nome, nível, moedas, data de registro
- **Paginação Inteligente**: Navegação eficiente com 10-100 itens por página
- **Ordenação Dinâmica**: Por qualquer coluna (nome, nível, XP, moedas, data)
- **Modal de Edição**: Interface intuitiva para modificação de dados

### ⚙️ Configurações do Sistema
- **Configurações Gerais**: Nome do bot, prefixo, idioma, fuso horário
- **Notificações**: Level up, lembretes diários, anúncios de eventos
- **Segurança**: Rate limiting, auto moderação, níveis de log
- **Banco de Dados**: Backup automático, retenção de dados, manutenção
- **Serviços**: Monitoramento e controle de API, Backend e Bot services
- **Analytics**: Configuração de coleta e análise de dados

### 📈 Analytics Avançados
- **Métricas de Usuário**: Retenção, atividade, crescimento
- **Análise de Comandos**: Distribuição, performance, taxa de sucesso
- **Atividade Temporal**: Picos de uso por hora/dia
- **Dashboards Personalizáveis**: Períodos configuráveis (1d, 7d, 30d, 90d)

### 🔌 Integração em Tempo Real
- **WebSocket Connection**: Conexão direta com Backend Service
- **Eventos Live**: Notificações instantâneas de level up, comandos, atividades
- **Auto-Reconnect**: Reconexão automática em caso de falha
- **Fallback Graceful**: Continuidade mesmo com serviços offline

## 🏗️ Arquitetura

### Stack Tecnológica
```
Frontend Framework: Next.js 14 (App Router)
UI Library: React 18 (Hooks + Context)
Styling: Tailwind CSS 3.3 + Headless UI
State Management: React Query + Context API
Real-time: Socket.IO Client
Charts: Recharts
Forms: React Hook Form
Animations: Framer Motion
Icons: Heroicons
```

### Estrutura de Componentes
```
src/
├── components/
│   ├── Layout.js              # Layout principal com navegação
│   ├── Dashboard/
│   │   ├── DashboardStats.js  # Cards de estatísticas
│   │   ├── UserGrowthChart.js # Gráfico de crescimento
│   │   ├── CommandUsageChart.js # Gráfico de comandos
│   │   ├── SystemHealth.js    # Status dos serviços
│   │   ├── EconomyOverview.js # Visão geral da economia
│   │   └── RecentActivity.js  # Atividade recente
│   ├── Users/
│   │   ├── UserTable.js       # Tabela de usuários
│   │   ├── UserModal.js       # Modal de edição
│   │   └── UserFilters.js     # Filtros e busca
│   └── Settings/
│       └── SettingsCard.js    # Card de configurações
├── contexts/
│   └── RealtimeContext.js     # Context do WebSocket
├── services/
│   └── apiService.js          # Client da API REST
├── pages/
│   ├── index.js               # Dashboard principal
│   ├── users.js               # Página de usuários
│   ├── analytics.js           # Página de analytics
│   └── settings.js            # Página de configurações
└── styles/
    └── globals.css            # Estilos globais + Tailwind
```

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- API Service rodando (porta 3001)
- Backend Service rodando (porta 3002)

### Configuração

1. **Instalar dependências**:
```bash
cd admin-panel
npm install
```

2. **Configurar variáveis de ambiente**:
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# API Service Configuration
API_SERVICE_URL=http://localhost:3001
API_SERVICE_TOKEN=admin-panel-token

# Backend Service Configuration  
BACKEND_SERVICE_URL=http://localhost:3002
BACKEND_SERVICE_TOKEN=admin-panel-backend-token

# NextAuth Configuration (opcional)
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-nextauth-secret

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Dashboard Settings
ENABLE_REALTIME=true
REFRESH_INTERVAL=30000
```

3. **Executar em desenvolvimento**:
```bash
npm run dev
```

4. **Build para produção**:
```bash
npm run build
npm start
```

## 🎯 Uso

### Acessando o Admin Panel
1. Abra `http://localhost:3003` no navegador
2. Faça login com as credenciais configuradas
3. Navegue pelas seções usando o menu lateral

### Principais Funcionalidades

#### Dashboard
- **Visão Geral**: Estatísticas principais do sistema
- **Gráficos**: Crescimento de usuários e uso de comandos
- **Status**: Monitoramento de serviços em tempo real
- **Atividade**: Feed de eventos recentes

#### Gerenciamento de Usuários
- **Listar**: Visualizar todos os usuários com paginação
- **Filtrar**: Buscar por nome, nível, ou outros critérios
- **Editar**: Modificar XP, moedas, e dados do usuário
- **Criar**: Adicionar novos usuários manualmente

#### Configurações
- **Sistema**: Configurações gerais do bot
- **Segurança**: Rate limiting e moderação
- **Backup**: Configuração de backup automático
- **Serviços**: Controle dos microserviços

#### Analytics
- **Métricas**: Análise detalhada de uso
- **Gráficos**: Visualização de dados temporais
- **Performance**: Taxa de sucesso e tempo de resposta
- **Relatórios**: Exportação de dados (futuro)

## 🔧 Configuração Avançada

### WebSocket Real-time
O admin panel se conecta automaticamente ao Backend Service via WebSocket para receber atualizações em tempo real:

```javascript
// Eventos suportados
- stats:update          # Estatísticas atualizadas
- user:levelUp          # Usuário subiu de nível
- user:dailyClaimed     # Daily reward coletado
- command:executed      # Comando executado
- system:notification   # Notificação do sistema
```

### API Integration
Integração completa com a API REST para todas as operações CRUD:

```javascript
// Endpoints utilizados
GET    /users              # Listar usuários
POST   /users              # Criar usuário
PUT    /users/:id          # Atualizar usuário
DELETE /users/:id          # Deletar usuário
GET    /users/stats        # Estatísticas
GET    /economy/overview   # Dados da economia
GET    /analytics          # Dados de analytics
```

### Customização de Temas
O sistema usa Tailwind CSS com tema customizável:

```css
/* Cores principais personalizáveis */
:root {
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  /* ... outras cores */
}
```

## 📱 Responsividade

O admin panel é totalmente responsivo:
- **Desktop**: Layout completo com sidebar
- **Tablet**: Navegação adaptativa
- **Mobile**: Menu collapse e cards empilhados

## 🔒 Segurança

### Autenticação
- Token-based authentication
- Session management
- Credential validation

### Autorização
- Admin-only access
- API token validation
- CORS protection

### Segurança de Dados
- Input validation
- XSS protection
- CSRF tokens

## 🎨 Interface

### Design System
- **Paleta de Cores**: Azul primário, tons neutros
- **Tipografia**: Inter font, hierarquia clara
- **Spacing**: Sistema 4px base (Tailwind)
- **Componentes**: Design consistente e reutilizável

### UX/UI Features
- **Loading States**: Spinners e skeletons
- **Error Handling**: Messages e fallbacks
- **Animations**: Framer Motion para transições
- **Notifications**: Toast messages com react-hot-toast

## 🔄 Integração com Microserviços

O Admin Panel faz parte da arquitetura de microserviços do MaryBot:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  Backend Service │    │   API Service   │
│   (Next.js)     │◄──►│   (WebSocket)    │◄──►│    (REST)       │
│   Port: 3003    │    │   Port: 3002     │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   Event Bus     │    │   PostgreSQL    │
│   Updates       │    │   Orchestration │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Deploy

### Desenvolvimento Local
```bash
npm run dev  # http://localhost:3003
```

### Produção
```bash
npm run build
npm start    # Servidor otimizado
```

### Docker (Futuro)
```dockerfile
FROM node:18-alpine
COPY . .
RUN npm ci --only=production
EXPOSE 3003
CMD ["npm", "start"]
```

## 📊 Monitoramento

O admin panel inclui monitoramento integrado:
- **Performance**: Tempo de resposta da API
- **Uptime**: Status dos serviços
- **Erros**: Log de erros e exceções
- **Uso**: Métricas de utilização

## 🎯 Roadmap Futuro

### Próximas Funcionalidades
- [ ] **Autenticação Avançada**: OAuth, 2FA
- [ ] **Relatórios**: Exportação PDF/Excel
- [ ] **Logs**: Visualização de logs do sistema
- [ ] **Configuração de Eventos**: Criar eventos customizados
- [ ] **Backup Management**: Interface para backups
- [ ] **Multi-tenant**: Suporte a múltiplos bots
- [ ] **Dark Mode**: Tema escuro
- [ ] **Mobile App**: App nativo React Native

### Melhorias Técnicas
- [ ] **Server-Side Rendering**: Melhor SEO
- [ ] **Progressive Web App**: PWA features
- [ ] **GraphQL**: API mais eficiente
- [ ] **Micro-frontends**: Arquitetura modular
- [ ] **Testing**: Testes automatizados

## 🤝 Contribuição

Para contribuir com o Admin Panel:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🙋‍♂️ Suporte

Para suporte técnico:
- **GitHub Issues**: Reportar bugs e solicitar features
- **Discord**: Comunidade MaryBot
- **Email**: Contato direto com os desenvolvedores

---

**Desenvolvido com ❤️ para a comunidade anime**

*Admin Panel do MaryBot - Gerenciamento profissional para seu bot Discord*
import { useState } from 'react';
import Layout from '@/components/Layout';
import SettingsCard from '@/components/Settings/SettingsCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useRealtime } from '@/contexts/RealtimeContext';
import Head from 'next/head';
import toast from 'react-hot-toast';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  ServerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function Settings() {
  const queryClient = useQueryClient();
  const { isConnected, reconnect } = useRealtime();
  const [activeTab, setActiveTab] = useState('general');

  // Fetch system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: apiService.getSystemSettings,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: apiService.updateSystemSettings,
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso!');
      queryClient.invalidateQueries(['settings']);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configurações');
      console.error('Settings update error:', error);
    },
  });

  const handleSettingsUpdate = (newSettings) => {
    updateSettingsMutation.mutate(newSettings);
  };

  const handleSystemAction = async (action) => {
    try {
      switch (action) {
        case 'restart-bot':
          await apiService.restartBotService();
          toast.success('Bot reiniciado com sucesso!');
          break;
        case 'clear-cache':
          await apiService.clearSystemCache();
          toast.success('Cache limpo com sucesso!');
          break;
        case 'backup-database':
          await apiService.createDatabaseBackup();
          toast.success('Backup criado com sucesso!');
          break;
        case 'reconnect-websocket':
          reconnect();
          toast.success('Reconectando WebSocket...');
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error(`Erro ao executar ação: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'general', name: 'Geral', icon: CogIcon },
    { id: 'notifications', name: 'Notificações', icon: BellIcon },
    { id: 'security', name: 'Segurança', icon: ShieldCheckIcon },
    { id: 'database', name: 'Banco de Dados', icon: DatabaseIcon },
    { id: 'services', name: 'Serviços', icon: ServerIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8" />
          <span className="ml-3 text-gray-600">Carregando configurações...</span>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Configurações - MaryBot Admin</title>
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                  <p className="text-gray-600 mt-1">
                    Gerenciar configurações do sistema MaryBot
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                      WebSocket {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  {!isConnected && (
                    <button
                      onClick={() => handleSystemAction('reconnect-websocket')}
                      className="btn-secondary text-sm"
                    >
                      Reconectar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar */}
              <div className="lg:w-64 flex-shrink-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full sidebar-link ${
                          activeTab === tab.id
                            ? 'sidebar-link-active'
                            : 'sidebar-link-inactive'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="space-y-6">
                  {activeTab === 'general' && (
                    <SettingsCard
                      title="Configurações Gerais"
                      description="Configurações básicas do bot e sistema"
                      settings={settings?.general || {}}
                      onUpdate={(data) => handleSettingsUpdate({ general: data })}
                      fields={[
                        { name: 'botName', label: 'Nome do Bot', type: 'text' },
                        { name: 'prefix', label: 'Prefixo de Comandos', type: 'text' },
                        { name: 'language', label: 'Idioma', type: 'select', options: [
                          { value: 'pt-BR', label: 'Português (Brasil)' },
                          { value: 'en-US', label: 'English (US)' }
                        ]},
                        { name: 'timezone', label: 'Fuso Horário', type: 'text' },
                      ]}
                    />
                  )}

                  {activeTab === 'notifications' && (
                    <SettingsCard
                      title="Configurações de Notificações"
                      description="Gerenciar notificações e alertas do sistema"
                      settings={settings?.notifications || {}}
                      onUpdate={(data) => handleSettingsUpdate({ notifications: data })}
                      fields={[
                        { name: 'enableLevelUpNotifications', label: 'Notificações de Level Up', type: 'boolean' },
                        { name: 'enableDailyReminders', label: 'Lembretes Diários', type: 'boolean' },
                        { name: 'enableEventAnnouncements', label: 'Anúncios de Eventos', type: 'boolean' },
                        { name: 'notificationChannel', label: 'Canal de Notificações', type: 'text' },
                      ]}
                    />
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <SettingsCard
                        title="Configurações de Segurança"
                        description="Controle de acesso e segurança do sistema"
                        settings={settings?.security || {}}
                        onUpdate={(data) => handleSettingsUpdate({ security: data })}
                        fields={[
                          { name: 'enableRateLimit', label: 'Limitar Taxa de Comandos', type: 'boolean' },
                          { name: 'maxCommandsPerMinute', label: 'Max Comandos por Minuto', type: 'number' },
                          { name: 'enableAutoMod', label: 'Auto Moderação', type: 'boolean' },
                          { name: 'logLevel', label: 'Nível de Log', type: 'select', options: [
                            { value: 'error', label: 'Error' },
                            { value: 'warn', label: 'Warning' },
                            { value: 'info', label: 'Info' },
                            { value: 'debug', label: 'Debug' }
                          ]},
                        ]}
                      />
                    </div>
                  )}

                  {activeTab === 'database' && (
                    <div className="space-y-6">
                      <SettingsCard
                        title="Configurações de Banco de Dados"
                        description="Manutenção e backup do banco de dados"
                        settings={settings?.database || {}}
                        onUpdate={(data) => handleSettingsUpdate({ database: data })}
                        fields={[
                          { name: 'autoBackup', label: 'Backup Automático', type: 'boolean' },
                          { name: 'backupInterval', label: 'Intervalo de Backup (horas)', type: 'number' },
                          { name: 'retentionDays', label: 'Dias de Retenção', type: 'number' },
                        ]}
                      />
                      
                      <div className="card">
                        <div className="card-header">
                          <h3 className="text-lg font-medium">Ações de Banco de Dados</h3>
                          <p className="text-gray-600 text-sm">Executar operações de manutenção</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={() => handleSystemAction('backup-database')}
                            className="btn-primary"
                          >
                            Criar Backup Manual
                          </button>
                          <button
                            onClick={() => handleSystemAction('clear-cache')}
                            className="btn-secondary"
                          >
                            Limpar Cache
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'services' && (
                    <div className="space-y-6">
                      <div className="card">
                        <div className="card-header">
                          <h3 className="text-lg font-medium">Status dos Serviços</h3>
                          <p className="text-gray-600 text-sm">Monitorar e controlar serviços</p>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <div>
                                <h4 className="font-medium">API Service</h4>
                                <p className="text-sm text-gray-600">REST API rodando na porta 3001</p>
                              </div>
                            </div>
                            <span className="badge-success">Online</span>
                          </div>
                          
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <div>
                                <h4 className="font-medium">Backend Service</h4>
                                <p className="text-sm text-gray-600">WebSocket orquestração na porta 3002</p>
                              </div>
                            </div>
                            <span className="badge-success">Online</span>
                          </div>
                          
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                              <div>
                                <h4 className="font-medium">Discord Bot</h4>
                                <p className="text-sm text-gray-600">Bot Discord com WebSocket</p>
                              </div>
                            </div>
                            <span className={isConnected ? 'badge-success' : 'badge-danger'}>
                              {isConnected ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                              onClick={() => handleSystemAction('restart-bot')}
                              className="btn-secondary"
                            >
                              Reiniciar Bot Service
                            </button>
                            <button
                              onClick={() => handleSystemAction('reconnect-websocket')}
                              className="btn-secondary"
                              disabled={isConnected}
                            >
                              Reconectar WebSocket
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <SettingsCard
                      title="Configurações de Analytics"
                      description="Controle de coleta e análise de dados"
                      settings={settings?.analytics || {}}
                      onUpdate={(data) => handleSettingsUpdate({ analytics: data })}
                      fields={[
                        { name: 'enableAnalytics', label: 'Habilitar Analytics', type: 'boolean' },
                        { name: 'dataRetentionDays', label: 'Dias de Retenção de Dados', type: 'number' },
                        { name: 'enableUserTracking', label: 'Rastreamento de Usuários', type: 'boolean' },
                        { name: 'enableCommandTracking', label: 'Rastreamento de Comandos', type: 'boolean' },
                      ]}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardStats from '@/components/Dashboard/DashboardStats';
import RecentActivity from '@/components/Dashboard/RecentActivity';
import SystemHealth from '@/components/Dashboard/SystemHealth';
import UserGrowthChart from '@/components/Dashboard/UserGrowthChart';
import CommandUsageChart from '@/components/Dashboard/CommandUsageChart';
import EconomyOverview from '@/components/Dashboard/EconomyOverview';
import { useRealtime } from '@/contexts/RealtimeContext';
import { apiService } from '@/services/apiService';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';

export default function Dashboard() {
  const { isConnected, stats } = useRealtime();
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiService.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <>
      <Head>
        <title>Dashboard - MaryBot Admin</title>
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600 mt-1">
                    Visão geral do sistema MaryBot
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary text-sm"
                  >
                    Atualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="loading-spinner w-8 h-8" />
                <span className="ml-3 text-gray-600">Carregando dados...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="text-red-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Erro ao carregar dados
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error.message || 'Falha na comunicação com a API'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            {dashboardData && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <DashboardStats data={dashboardData.stats} realtimeStats={stats} />

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <UserGrowthChart data={dashboardData.userGrowth} />
                  <CommandUsageChart data={dashboardData.commandUsage} />
                </div>

                {/* Secondary Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <SystemHealth />
                  </div>
                  <div className="lg:col-span-1">
                    <EconomyOverview data={dashboardData.economy} />
                  </div>
                  <div className="lg:col-span-1">
                    <RecentActivity data={dashboardData.recentActivity} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
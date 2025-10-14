import { useState } from 'react';
import Layout from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Head from 'next/head';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function Analytics() {
  const [period, setPeriod] = useState('7d');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => apiService.getAnalytics(period),
  });

  const { data: commandAnalytics } = useQuery({
    queryKey: ['command-analytics', period],
    queryFn: () => apiService.getCommandAnalytics(period),
  });

  const { data: userAnalytics } = useQuery({
    queryKey: ['user-analytics', period],
    queryFn: () => apiService.getUserAnalytics(period),
  });

  // Mock data for demo
  const mockData = {
    userActivity: [
      { date: '2024-01-01', activeUsers: 120, newUsers: 15, commandsExecuted: 1500 },
      { date: '2024-01-02', activeUsers: 135, newUsers: 20, commandsExecuted: 1750 },
      { date: '2024-01-03', activeUsers: 150, newUsers: 25, commandsExecuted: 2000 },
      { date: '2024-01-04', activeUsers: 140, newUsers: 18, commandsExecuted: 1800 },
      { date: '2024-01-05', activeUsers: 160, newUsers: 30, commandsExecuted: 2200 },
    ],
    commandDistribution: [
      { name: 'daily', value: 35, count: 3500 },
      { name: 'profile', value: 25, count: 2500 },
      { name: 'gacha', value: 20, count: 2000 },
      { name: 'quiz', value: 15, count: 1500 },
      { name: 'leaderboard', value: 5, count: 500 },
    ],
    hourlyActivity: [
      { hour: '00:00', commands: 50 },
      { hour: '06:00', commands: 120 },
      { hour: '12:00', commands: 300 },
      { hour: '18:00', commands: 450 },
      { hour: '23:00', commands: 200 },
    ]
  };

  const data = analyticsData || mockData;

  return (
    <>
      <Head>
        <title>Analytics - MaryBot Admin</title>
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                  <p className="text-gray-600 mt-1">
                    Análise detalhada de uso e performance
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="input-field"
                  >
                    <option value="1d">Último dia</option>
                    <option value="7d">Última semana</option>
                    <option value="30d">Último mês</option>
                    <option value="90d">Últimos 3 meses</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="loading-spinner w-8 h-8" />
                <span className="ml-3 text-gray-600">Carregando analytics...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Activity Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Atividade de Usuários</h3>
                    <p className="text-sm text-gray-600">Usuários ativos e comandos executados por dia</p>
                  </div>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="activeUsers" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Usuários Ativos"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="newUsers" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Novos Usuários"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="commandsExecuted" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          name="Comandos Executados"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Command Distribution */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card"
                  >
                    <div className="card-header">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição de Comandos</h3>
                      <p className="text-sm text-gray-600">Comandos mais utilizados</p>
                    </div>
                    
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.commandDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {data.commandDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Hourly Activity */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card"
                  >
                    <div className="card-header">
                      <h3 className="text-lg font-medium text-gray-900">Atividade por Hora</h3>
                      <p className="text-sm text-gray-600">Picos de uso durante o dia</p>
                    </div>
                    
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.hourlyActivity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="commands" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* Statistics Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-blue-600">89.5%</div>
                    <div className="text-sm text-gray-600 mt-1">Taxa de Retenção</div>
                    <div className="text-xs text-green-600 mt-1">+2.3% esta semana</div>
                  </div>
                  
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-green-600">4.2</div>
                    <div className="text-sm text-gray-600 mt-1">Comandos/Usuário/Dia</div>
                    <div className="text-xs text-green-600 mt-1">+0.8 esta semana</div>
                  </div>
                  
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-purple-600">2.5min</div>
                    <div className="text-sm text-gray-600 mt-1">Tempo Médio de Sessão</div>
                    <div className="text-xs text-red-600 mt-1">-0.3min esta semana</div>
                  </div>
                  
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-orange-600">92.1%</div>
                    <div className="text-sm text-gray-600 mt-1">Taxa de Sucesso</div>
                    <div className="text-xs text-green-600 mt-1">+1.2% esta semana</div>
                  </div>
                </motion.div>

                {/* Top Commands Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card"
                >
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Top Comandos</h3>
                    <p className="text-sm text-gray-600">Comandos mais executados no período</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comando
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Execuções
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuários Únicos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Taxa de Sucesso
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tempo Médio
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[
                          { command: '/daily', executions: 3500, uniqueUsers: 890, successRate: 98.5, avgTime: '0.8s' },
                          { command: '/profile', executions: 2500, uniqueUsers: 750, successRate: 99.2, avgTime: '1.2s' },
                          { command: '/gacha', executions: 2000, uniqueUsers: 600, successRate: 95.8, avgTime: '2.1s' },
                          { command: '/quiz', executions: 1500, uniqueUsers: 450, successRate: 92.1, avgTime: '3.5s' },
                          { command: '/leaderboard', executions: 500, uniqueUsers: 350, successRate: 99.8, avgTime: '1.5s' },
                        ].map((row) => (
                          <tr key={row.command} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <code className="bg-gray-100 px-2 py-1 rounded">{row.command}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.executions.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.uniqueUsers.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.successRate > 95 ? 'bg-green-100 text-green-800' : 
                                row.successRate > 90 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {row.successRate}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.avgTime}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
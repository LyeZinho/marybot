import { motion } from 'framer-motion';
import {
  UsersIcon,
  CurrencyDollarIcon,
  CommandLineIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

export default function DashboardStats({ data, realtimeStats }) {
  const stats = [
    {
      name: 'Total de Usuários',
      value: realtimeStats?.totalUsers || data?.totalUsers || 0,
      change: '+12%',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'blue'
    },
    {
      name: 'Usuários Ativos',
      value: realtimeStats?.activeUsers || data?.activeUsers || 0,
      change: '+8%',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'green'
    },
    {
      name: 'Comandos Executados',
      value: data?.totalCommands || 0,
      change: '+25%',
      changeType: 'increase',
      icon: CommandLineIcon,
      color: 'purple'
    },
    {
      name: 'Total de Moedas',
      value: (data?.totalCoins || 0).toLocaleString(),
      change: '+15%',
      changeType: 'increase',
      icon: CurrencyDollarIcon,
      color: 'yellow'
    },
    {
      name: 'Nível Médio',
      value: data?.averageLevel || 0,
      change: '+5%',
      changeType: 'increase',
      icon: TrophyIcon,
      color: 'orange'
    },
    {
      name: 'Novos Usuários Hoje',
      value: data?.newUsersToday || 0,
      change: '+2%',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'indigo'
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-100',
      green: 'bg-green-500 text-green-600 bg-green-100',
      purple: 'bg-purple-500 text-purple-600 bg-purple-100',
      yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-100',
      orange: 'bg-orange-500 text-orange-600 bg-orange-100',
      indigo: 'bg-indigo-500 text-indigo-600 bg-indigo-100',
    };
    return colors[color].split(' ');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const [iconBg, textColor, cardBg] = getColorClasses(stat.color);
        
        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 ${cardBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${textColor}`} />
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {stat.name}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                  <div className={`flex items-center ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.changeType === 'increase' ? (
                      <ArrowUpIcon className="w-4 h-4" />
                    ) : (
                      <ArrowDownIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium ml-1">
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
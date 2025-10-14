import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function EconomyOverview({ data }) {
  const economyStats = [
    {
      name: 'Total de Moedas',
      value: data?.totalCoins?.toLocaleString() || '0',
      icon: CurrencyDollarIcon,
      color: 'yellow',
    },
    {
      name: 'Transações Diárias',
      value: data?.dailyTransactions || '0',
      icon: TrendingUpIcon,
      color: 'green',
    },
    {
      name: 'Média por Usuário',
      value: data?.averageCoinsPerUser?.toLocaleString() || '0',
      icon: UsersIcon,
      color: 'blue',
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      yellow: 'text-yellow-600 bg-yellow-100',
      green: 'text-green-600 bg-green-100',
      blue: 'text-blue-600 bg-blue-100',
    };
    return colors[color];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="card"
    >
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Economia</h3>
        <p className="text-sm text-gray-600">Visão geral do sistema econômico</p>
      </div>
      
      <div className="space-y-4">
        {economyStats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);
          
          return (
            <div key={stat.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {stat.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {data?.topSpenders && data.topSpenders.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Maiores Gastadores
          </h4>
          <div className="space-y-2">
            {data.topSpenders.slice(0, 3).map((spender, index) => (
              <div key={spender.username} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900">
                    {spender.username}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {spender.spent.toLocaleString()} 🪙
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
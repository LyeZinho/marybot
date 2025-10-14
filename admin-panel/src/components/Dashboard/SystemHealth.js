import { useRealtime } from '@/contexts/RealtimeContext';
import { motion } from 'framer-motion';
import {
  ServerIcon,
  WifiIcon,
  DatabaseIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

export default function SystemHealth() {
  const { isConnected } = useRealtime();

  const services = [
    {
      name: 'API Service',
      status: 'online',
      uptime: '99.9%',
      icon: ServerIcon,
      description: 'REST API rodando',
    },
    {
      name: 'Backend Service',
      status: 'online',
      uptime: '99.8%',
      icon: CpuChipIcon,
      description: 'WebSocket ativo',
    },
    {
      name: 'Discord Bot',
      status: isConnected ? 'online' : 'offline',
      uptime: isConnected ? '99.7%' : '0%',
      icon: WifiIcon,
      description: isConnected ? 'Conectado' : 'Desconectado',
    },
    {
      name: 'Database',
      status: 'online',
      uptime: '99.9%',
      icon: DatabaseIcon,
      description: 'PostgreSQL ativo',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'warning':
        return 'Atenção';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card"
    >
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Status do Sistema</h3>
        <p className="text-sm text-gray-600">Monitoramento dos serviços</p>
      </div>
      
      <div className="space-y-4">
        {services.map((service) => {
          const Icon = service.icon;
          const statusColor = getStatusColor(service.status);
          
          return (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${statusColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {service.name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {service.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  service.status === 'online' ? 'bg-green-100 text-green-800' :
                  service.status === 'offline' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getStatusText(service.status)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Uptime: {service.uptime}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-green-600">99.8%</p>
            <p className="text-sm text-gray-600">Uptime Geral</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-blue-600">
              {isConnected ? '4/4' : '3/4'}
            </p>
            <p className="text-sm text-gray-600">Serviços Online</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
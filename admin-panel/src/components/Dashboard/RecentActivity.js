import { useRealtime } from '@/contexts/RealtimeContext';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ClockIcon,
  UserIcon,
  CommandLineIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

export default function RecentActivity({ data }) {
  const { events } = useRealtime();
  
  // Combine real-time events with initial data
  const allActivities = [...(events || []), ...(data || [])].slice(0, 10);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'level_up':
        return TrophyIcon;
      case 'command_executed':
        return CommandLineIcon;
      case 'daily_claimed':
        return ClockIcon;
      default:
        return UserIcon;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'level_up':
        return 'text-yellow-600 bg-yellow-100';
      case 'command_executed':
        return 'text-blue-600 bg-blue-100';
      case 'daily_claimed':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="card"
    >
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Atividade Recente</h3>
        <p className="text-sm text-gray-600">Últimas ações dos usuários</p>
      </div>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {allActivities.length === 0 ? (
            <li className="text-center py-8 text-gray-500">
              Nenhuma atividade recente
            </li>
          ) : (
            allActivities.map((activity, activityIdx) => {
              const Icon = getActivityIcon(activity.type);
              const colorClasses = getActivityColor(activity.type);
              
              return (
                <li key={activity.id || activityIdx}>
                  <div className="relative pb-8">
                    {activityIdx !== allActivities.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${colorClasses}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-900">
                            {activity.message || activity.action}
                          </p>
                          {activity.user && (
                            <p className="text-sm text-gray-600">
                              por {activity.user}
                            </p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          {activity.timestamp ? (
                            format(
                              new Date(activity.timestamp),
                              'HH:mm',
                              { locale: ptBR }
                            )
                          ) : (
                            'Agora'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </motion.div>
  );
}
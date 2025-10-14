import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function CommandUsageChart({ data }) {
  const chartData = data?.slice(0, 8) || []; // Show top 8 commands

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Comandos Mais Usados</h3>
        <p className="text-sm text-gray-600">Uso de comandos nos últimos 7 dias</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              type="category" 
              dataKey="command"
              stroke="#6b7280"
              fontSize={12}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [value.toLocaleString(), 'Execuções']}
            />
            <Bar
              dataKey="count"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
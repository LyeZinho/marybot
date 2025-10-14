import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

export default function UserFilters({ filters, onFilterChange, totalUsers }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const handleSortChange = (sortBy) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFilterChange({ sortBy, sortOrder: newSortOrder });
  };

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center space-x-4">
          <select
            value={filters.level}
            onChange={(e) => handleInputChange('level', e.target.value)}
            className="input-field"
          >
            <option value="">Todos os níveis</option>
            <option value="1-10">Nível 1-10</option>
            <option value="11-25">Nível 11-25</option>
            <option value="26-50">Nível 26-50</option>
            <option value="50+">Nível 50+</option>
          </select>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn-secondary flex items-center space-x-2"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <div className="flex space-x-2">
                {['createdAt', 'level', 'coins', 'xp'].map((sortOption) => (
                  <button
                    key={sortOption}
                    onClick={() => handleSortChange(sortOption)}
                    className={`btn-secondary text-sm flex items-center space-x-1 ${
                      filters.sortBy === sortOption ? 'bg-primary-100 text-primary-700' : ''
                    }`}
                  >
                    <span className="capitalize">
                      {sortOption === 'createdAt' ? 'Data' : sortOption}
                    </span>
                    {filters.sortBy === sortOption && (
                      filters.sortOrder === 'desc' ? (
                        <ArrowDownIcon className="w-3 h-3" />
                      ) : (
                        <ArrowUpIcon className="w-3 h-3" />
                      )
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Itens por página
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleInputChange('limit', parseInt(e.target.value))}
                className="input-field"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => onFilterChange({
                  search: '',
                  level: '',
                  sortBy: 'createdAt',
                  sortOrder: 'desc',
                  page: 1,
                  limit: 20
                })}
                className="btn-secondary"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Mostrando{' '}
          <span className="font-medium">
            {((filters.page - 1) * filters.limit) + 1}
          </span>
          {' '}-{' '}
          <span className="font-medium">
            {Math.min(filters.page * filters.limit, totalUsers)}
          </span>
          {' '}de{' '}
          <span className="font-medium">{totalUsers}</span>
          {' '}usuários
        </p>
      </div>
    </div>
  );
}
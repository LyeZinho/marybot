import { useState } from 'react';
import Layout from '@/components/Layout';
import UserTable from '@/components/Users/UserTable';
import UserModal from '@/components/Users/UserModal';
import UserFilters from '@/components/Users/UserFilters';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { PlusIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';
import toast from 'react-hot-toast';

export default function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  // Fetch users
  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => apiService.getUsers(filters),
    keepPreviousData: true,
  });

  const handleUserEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleUserCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleUserDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await apiService.deleteUser(userId);
        toast.success('Usuário excluído com sucesso!');
        refetch();
      } catch (error) {
        toast.error('Erro ao excluir usuário');
        console.error('Delete error:', error);
      }
    }
  };

  const handleModalSave = async (userData) => {
    try {
      if (selectedUser) {
        await apiService.updateUser(selectedUser.id, userData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await apiService.createUser(userData);
        toast.success('Usuário criado com sucesso!');
      }
      setIsModalOpen(false);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      toast.error('Erro ao salvar usuário');
      console.error('Save error:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  return (
    <>
      <Head>
        <title>Usuários - MaryBot Admin</title>
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
                  <p className="text-gray-600 mt-1">
                    Gerenciar usuários registrados no sistema
                  </p>
                </div>
                <button
                  onClick={handleUserCreate}
                  className="btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Novo Usuário</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Filters */}
            <div className="mb-6">
              <UserFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                totalUsers={usersData?.total || 0}
              />
            </div>

            {/* Content */}
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="loading-spinner w-8 h-8" />
                <span className="ml-3 text-gray-600">Carregando usuários...</span>
              </div>
            )}

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
                      Erro ao carregar usuários
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error.message || 'Falha na comunicação com a API'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {usersData && (
              <UserTable
                users={usersData.users}
                total={usersData.total}
                page={filters.page}
                limit={filters.limit}
                onEdit={handleUserEdit}
                onDelete={handleUserDelete}
                onPageChange={handlePageChange}
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSort={(sortBy, sortOrder) => 
                  setFilters({ ...filters, sortBy, sortOrder })
                }
              />
            )}
          </div>

          {/* User Modal */}
          <UserModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedUser(null);
            }}
            onSave={handleModalSave}
            user={selectedUser}
          />
        </div>
      </Layout>
    </>
  );
}
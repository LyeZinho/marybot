import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { Fragment } from 'react';

export default function UserModal({ isOpen, onClose, onSave, user }) {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setValue('username', user.username);
      setValue('discordId', user.discordId);
      setValue('coins', user.coins);
      setValue('xp', user.xp);
    } else {
      reset();
    }
  }, [user, setValue, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fechar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {user ? 'Editar Usuário' : 'Novo Usuário'}
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                          Nome de Usuário
                        </label>
                        <input
                          type="text"
                          id="username"
                          {...register('username', { 
                            required: 'Nome de usuário é obrigatório',
                            minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                            maxLength: { value: 32, message: 'Máximo 32 caracteres' }
                          })}
                          className={`mt-1 input-field ${errors.username ? 'border-red-300' : ''}`}
                          placeholder="Digite o nome de usuário"
                        />
                        {errors.username && (
                          <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="discordId" className="block text-sm font-medium text-gray-700">
                          Discord ID
                        </label>
                        <input
                          type="text"
                          id="discordId"
                          {...register('discordId', { 
                            required: 'Discord ID é obrigatório',
                            pattern: {
                              value: /^\d{17,19}$/,
                              message: 'Discord ID deve ter 17-19 dígitos'
                            }
                          })}
                          className={`mt-1 input-field ${errors.discordId ? 'border-red-300' : ''}`}
                          placeholder="123456789012345678"
                        />
                        {errors.discordId && (
                          <p className="mt-1 text-sm text-red-600">{errors.discordId.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="coins" className="block text-sm font-medium text-gray-700">
                            Moedas
                          </label>
                          <input
                            type="number"
                            id="coins"
                            min="0"
                            {...register('coins', { 
                              required: 'Quantidade de moedas é obrigatória',
                              min: { value: 0, message: 'Mínimo 0 moedas' },
                              valueAsNumber: true
                            })}
                            className={`mt-1 input-field ${errors.coins ? 'border-red-300' : ''}`}
                            placeholder="0"
                          />
                          {errors.coins && (
                            <p className="mt-1 text-sm text-red-600">{errors.coins.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="xp" className="block text-sm font-medium text-gray-700">
                            XP
                          </label>
                          <input
                            type="number"
                            id="xp"
                            min="0"
                            {...register('xp', { 
                              required: 'XP é obrigatório',
                              min: { value: 0, message: 'Mínimo 0 XP' },
                              valueAsNumber: true
                            })}
                            className={`mt-1 input-field ${errors.xp ? 'border-red-300' : ''}`}
                            placeholder="0"
                          />
                          {errors.xp && (
                            <p className="mt-1 text-sm text-red-600">{errors.xp.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="inline-flex w-full justify-center btn-primary sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <>
                              <div className="loading-spinner w-4 h-4 mr-2" />
                              Salvando...
                            </>
                          ) : (
                            user ? 'Atualizar' : 'Criar'
                          )}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center btn-secondary sm:mt-0 sm:w-auto"
                          onClick={onClose}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
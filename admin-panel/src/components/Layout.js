import { useState, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  GameController2Icon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { BellIcon } from '@heroicons/react/24/solid';
import { useRealtime } from '@/contexts/RealtimeContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Usuários', href: '/users', icon: UsersIcon },
  { name: 'Economia', href: '/economy', icon: CurrencyDollarIcon },
  { name: 'Jogos', href: '/games', icon: GameController2Icon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Configurações', href: '/settings', icon: CogIcon },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout({ children }) {
  const router = useRouter();
  const { isConnected, stats } = useRealtime();
  const [notifications] = useState([
    { id: 1, message: 'Novo usuário registrado', time: '2 min atrás', read: false },
    { id: 2, message: 'Sistema atualizado com sucesso', time: '1 hora atrás', read: true },
  ]);

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="min-h-full">
      <Disclosure as="nav" className="bg-white shadow-sm border-b border-gray-200">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between">
                {/* Left side */}
                <div className="flex">
                  <div className="flex flex-shrink-0 items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">M</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900">MaryBot Admin</span>
                    </div>
                  </div>
                  
                  {/* Desktop Navigation */}
                  <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = router.pathname === item.href;
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={classNames(
                            isActive
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                            'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium space-x-2'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Right side */}
                <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                  {/* Connection Status */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                      {isConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Real-time Stats */}
                  {stats && (
                    <div className="text-sm text-gray-600">
                      {stats.activeUsers} usuários ativos
                    </div>
                  )}

                  {/* Notifications */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="relative flex rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Ver notificações</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                        {unreadNotifications.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                            {unreadNotifications.length}
                          </span>
                        )}
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <h3 className="text-sm font-medium text-gray-900">Notificações</h3>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            Nenhuma notificação
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <Menu.Item key={notification.id}>
                              {({ active }) => (
                                <div
                                  className={classNames(
                                    active ? 'bg-gray-50' : '',
                                    'px-4 py-2 border-b border-gray-100 last:border-b-0'
                                  )}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900">{notification.message}</p>
                                      <p className="text-xs text-gray-500">{notification.time}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Menu.Item>
                          ))
                        )}
                      </Menu.Items>
                    </Transition>
                  </Menu>

                  {/* User Menu */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Abrir menu do usuário</span>
                        <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">A</span>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              Perfil
                            </a>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              Configurações
                            </a>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="#"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              Sair
                            </a>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>

                {/* Mobile menu button */}
                <div className="-mr-2 flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    <span className="sr-only">Abrir menu principal</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pb-3 pt-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        isActive
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800',
                        'flex border-l-4 py-2 pl-3 pr-4 text-base font-medium items-center space-x-3'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
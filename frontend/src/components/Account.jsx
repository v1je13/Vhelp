// src/components/Account.jsx
import { useState, useEffect } from 'react';
import { Card, Avatar, Button, Spinner, Text } from '@vkontakte/vkui';
import { vk } from '../lib/vk';
import { api } from '../api/client';

export function Account({ user, onUserUpdate, onLogout }) {
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    let unsubscribe;
    
    // Проверка токена при загрузке
    const token = localStorage.getItem('vhelp_token');
    
    if (!token) {
      console.log('⚠️ Token not found, initializing VK Bridge...');
      setDebugInfo('Инициализация VK Bridge...');
    }
    
    const initAuth = async () => {
      if (user?.token) {
        try {
          const userData = await api.getMe();
          onUserUpdate?.(userData);
          setLoading(false);
          return;
        } catch (err) {
          localStorage.removeItem('vhelp_token');
          localStorage.removeItem('vhelp_user');
        }
      }
      
      unsubscribe = vk.init(async (authData) => {
        if (!authData.vk_user_id) {
          setError('Нет vk_user_id');
          setLoading(false);
          return;
        }
        
        try {
          setLoading(true);
          
          // 🔥 КЛЮЧЕВОЙ МОМЕНТ: логируем ответ
          console.log('📡 Отправляем vkAuth с данными:', { vk_user_id: authData.vk_user_id });
          const response = await api.vkAuth(authData);
          console.log('✅ Ответ от бэкенда:', response);
          
          // 🔥 Проверяем, что в ответе есть token
          if (!response?.token) {
            throw new Error('No token in response: ' + JSON.stringify(response));
          }
          
          // 🔥 Сохраняем и проверяем
          console.log('💾 Сохраняем токен...');
          localStorage.setItem('vhelp_token', response.token);
          localStorage.setItem('vhelp_user', JSON.stringify(response.user));
          
          // 🔥 Мгновенная проверка
          console.log('🔍 Проверка localStorage:', {
            token: localStorage.getItem('vhelp_token') ? '✓' : '✗',
            user: localStorage.getItem('vhelp_user') ? '✓' : '✗'
          });
          
          onUserUpdate?.(response.user);
          
        } catch (err) {
          console.error('❌ ОШИБКА АВТОРИЗАЦИИ:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      });
    };
    
    initAuth();
    return () => unsubscribe?.();
  }, [user, onUserUpdate]);

  // 📋 Состояния отображения
  
  if (loading && !user) {
    return (
      <Card style={{ padding: 20, textAlign: 'center' }}>
        <Spinner size="large" />
        <Text style={{ marginTop: 15, marginBottom: 10 }}>
          {debugInfo || 'Загрузка профиля...'}
        </Text>
        <Text caption style={{ color: '#818c99' }}>
          {error || 'Ожидание ответа от VK...'}
        </Text>
      </Card>
    );
  }
  
  if (error && !user) {
    return (
      <Card style={{ padding: 20 }}>
        <Text weight="2" style={{ marginBottom: 10, color: '#e64646' }}>
          ⚠️ Авторизация не удалась
        </Text>
        <Text style={{ marginBottom: 15, fontSize: 14 }}>
          {error}
        </Text>
        <Text caption style={{ display: 'block', marginBottom: 15, color: '#818c99' }}>
          💡 Для локальной разработки:<br/>
          1. Откройте приложение внутри VK<br/>
          2. Или добавьте тестового пользователя вручную
        </Text>
        <Button 
          mode="secondary" 
          onClick={() => window.location.reload()}
          stretched
        >
          Попробовать снова
        </Button>
      </Card>
    );
  }
  
  if (!user) {
    return (
      <Card style={{ padding: 20, textAlign: 'center' }}>
        <Text weight="2" style={{ marginBottom: 10, fontSize: 20 }}>
          Добро пожаловать!
        </Text>
        <Text style={{ marginBottom: 15, color: '#818c99' }}>
          Для доступа к приложению необходимо авторизоваться
        </Text>
        <Button 
          mode="primary" 
          size="l"
          onClick={() => {
            // Принудительная авторизация
            vk.init(async (authData) => {
              if (!authData.vk_user_id) {
                setError('Нет vk_user_id');
                return;
              }
              
              try {
                setLoading(true);
                console.log('📡 Отправляем vkAuth с данными:', { vk_user_id: authData.vk_user_id });
                const response = await api.vkAuth(authData);
                console.log('✅ Ответ от бэкенда:', response);
                
                if (!response?.token) {
                  throw new Error('No token in response: ' + JSON.stringify(response));
                }
                
                console.log('💾 Сохраняем токен...');
                localStorage.setItem('vhelp_token', response.token);
                localStorage.setItem('vhelp_user', JSON.stringify(response.user));
                
                console.log('🔍 Проверка localStorage:', {
                  token: localStorage.getItem('vhelp_token') ? '✓' : '✗',
                  user: localStorage.getItem('vhelp_user') ? '✓' : '✗'
                });
                
                onUserUpdate?.(response.user);
              } catch (err) {
                console.error('❌ ОШИБКА АВТОРИЗАЦИИ:', err);
                setError(err.message);
              } finally {
                setLoading(false);
              }
            });
          }}
          stretched
        >
          Войти через VK
        </Button>
        {debugInfo && (
          <Text caption style={{ display: 'block', marginTop: 15, color: '#818c99' }}>
            {debugInfo}
          </Text>
        )}
      </Card>
    );
  }
  
  // ✅ Отображение профиля
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <Avatar 
          src={user.avatar} 
          size={64}
          fallbackIcon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
            </svg>
          }
        />
        <div style={{ flex: 1 }}>
          <Text weight="1" style={{ fontSize: 18 }}>
            {user.firstName} {user.lastName}
          </Text>
          {user.bio && (
            <Text caption style={{ color: '#818c99', marginTop: 4 }}>
              {user.bio}
            </Text>
          )}
        </div>
      </div>
      
      <Button 
        mode="secondary" 
        onClick={onLogout}
        stretched
      >
        Выйти
      </Button>
    </Card>
  );
}

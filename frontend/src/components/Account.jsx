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
    
    const initAuth = async () => {
      setDebugInfo('🔍 Проверка сохранённого токена...');
      
      // Если пользователь уже есть — проверяем токен
      if (user?.token) {
        try {
          setDebugInfo('✅ Токен найден, проверяем валидность...');
          const userData = await api.getMe();
          onUserUpdate?.(userData);
          setLoading(false);
          setDebugInfo('✅ Профиль загружен из API');
          return;
        } catch (err) {
          console.warn('⚠️ Токен невалиден, очищаем:', err);
          localStorage.removeItem('vhelp_token');
          localStorage.removeItem('vhelp_user');
          // Продолжаем авто-авторизацию
        }
      }
      
      setDebugInfo('🔄 Инициализация VK Bridge...');
      
      // Если пользователя нет — инициализируем авто-авторизацию
      unsubscribe = vk.init(async (authData) => {
        setDebugInfo('📥 Получены данные от VK Bridge');
        console.log('VK Auth Data:', authData);
        
        if (!authData.vk_user_id) {
          setDebugInfo('❌ Нет vk_user_id в данных VK');
          setError('Не удалось получить данные из VK');
          setLoading(false);
          return;
        }
        
        try {
          setDebugInfo('🔐 Отправка данных на бэкенд...');
          setLoading(true);
          setError(null);
          
          // Отправляем данные на бэкенд
          const response = await api.vkAuth(authData);
          
          // Сохраняем токен и пользователя
          localStorage.setItem('vhelp_token', response.token);
          localStorage.setItem('vhelp_user', JSON.stringify(response.user));
          
          // Обновляем состояние в приложении
          onUserUpdate?.(response.user);
          setDebugInfo('✅ Авторизация успешна!');
        } catch (err) {
          console.error('❌ Auto-auth error:', err);
          setError(err.message || 'Не удалось авторизоваться');
          setDebugInfo('❌ Ошибка: ' + err.message);
        } finally {
          setLoading(false);
        }
      });

      // Таймаут 5 секунд для локальной разработки
      setTimeout(() => {
        if (loading) {
          setDebugInfo('⏱ Таймаут VK Bridge (нормально для локальной разработки)');
          console.warn('⏱ VK Bridge не ответил за 5 секунд - это нормально при запуске вне VK');
          setLoading(false);
          setError('VK Bridge не ответил. Откройте приложение внутри VK для авторизации.');
        }
      }, 5000);
    };
    
    initAuth();
    
    // Cleanup
    return () => unsubscribe?.();
  }, [user, onUserUpdate, loading]);

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
        <Text weight="2" style={{ marginBottom: 10 }}>
          Профиль не загружен
        </Text>
        <Text caption style={{ display: 'block', marginBottom: 15, color: '#818c99' }}>
          {debugInfo}
        </Text>
        <Button 
          mode="secondary" 
          onClick={() => window.location.reload()}
          stretched
        >
          Обновить страницу
        </Button>
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

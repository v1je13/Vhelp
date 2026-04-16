// src/components/Account.jsx
import { useState, useEffect } from 'react';
import { 
  Card, Avatar, Text, Button, Spinner, 
  Separator, Group, InfoRow, Cell, Placeholder 
} from '@vkontakte/vkui';
import { Icon28UserOutline, Icon28SettingsOutline } from '@vkontakte/icons';
import { vk } from '../lib/vk';
import { api } from '../api/client';

export function Account({ user, onUserUpdate, onLogout }) {
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);
  
  // 🔁 Авто-загрузка профиля при монтировании
  useEffect(() => {
    let unsubscribe;
    
    const initAuth = async () => {
      // Если пользователь уже есть в state — проверяем токен
      if (user?.token) {
        try {
          const userData = await api.getMe();
          onUserUpdate?.(userData);
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Token invalid, re-authenticating:', err);
          // Токен невалиден — продолжаем авто-авторизацию
        }
      }
      
      // Если пользователя нет — инициализируем авто-авторизацию
      unsubscribe = vk.init(async (authData) => {
        if (!authData.vk_user_id) return;
        
        try {
          setLoading(true);
          setError(null);
          
          // Отправляем данные на бэкенд
          const response = await api.vkAuth(authData);
          
          // Сохраняем токен и пользователя
          localStorage.setItem('vhelp_token', response.token);
          localStorage.setItem('vhelp_user', JSON.stringify(response.user));
          
          // Обновляем состояние в приложении
          onUserUpdate?.(response.user);
        } catch (err) {
          console.error('Auto-auth error:', err);
          setError(err.message || 'Не удалось авторизоваться');
        } finally {
          setLoading(false);
        }
      });
    };
    
    initAuth();
    
    // Cleanup: отписываемся от событий при размонтировании
    return () => unsubscribe?.();
  }, [user, onUserUpdate]);
  
  // 🔄 Ручное обновление профиля (по кнопке)
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const userData = await api.getMe();
      onUserUpdate?.(userData);
      localStorage.setItem('vhelp_user', JSON.stringify(userData));
      await vk.showNotification('Обновлено', 'Профиль обновлён');
    } catch (err) {
      setError(err.message || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };
  
  // 🚪 Выход из аккаунта
  const handleLogout = () => {
    api.logout();
    onLogout?.();
    vk.showNotification('Выход', 'Вы вышли из аккаунта');
  };
  
  // 📋 Состояния отображения
  if (loading && !user) {
    return (
      <Group style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="large" />
        <Text style={{ marginLeft: 10 }}>Загрузка профиля...</Text>
      </Group>
    );
  }
  
  if (error && !user) {
    return (
      <Placeholder
        icon={<Icon28UserOutline />}
        header="Не удалось загрузить профиль"
        description={error}
        action={<Button mode="secondary" onClick={handleRefresh}>Попробовать снова</Button>}
      />
    );
  }
  
  if (!user) {
    return (
      <Placeholder
        icon={<Icon28UserOutline />}
        header="Профиль не найден"
        description="Попробуйте обновить страницу или перезапустить приложение"
        action={<Button mode="secondary" onClick={() => window.location.reload()}>Обновить</Button>}
      />
    );
  }
  
  // ✅ Отображение профиля
  return (
    <Group header={<Text weight="2">Мой профиль</Text>}>
      {/* Аватар и имя */}
      <Card style={{ padding: 20, textAlign: 'center', marginBottom: 15 }}>
        <Avatar 
          src={user.avatar} 
          size={96} 
          mode={user.avatar ? 'image' : 'image'}
          fallbackIcon={<Icon28UserOutline />}
        />
        <Text weight="1" style={{ marginTop: 12, fontSize: 18 }}>
          {user.firstName} {user.lastName}
        </Text>
        {user.bio && <Text caption style={{ marginTop: 4, color: '#818c99' }}>{user.bio}</Text>}
      </Card>
      
      {/* Информация */}
      <Card mode="shadow" style={{ marginBottom: 15 }}>
        <InfoRow header="ID ВКонтакте">
          <Text>{user.vkId}</Text>
        </InfoRow>
        <Separator />
        <InfoRow header="Дата регистрации">
          <Text>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</Text>
        </InfoRow>
      </Card>
      
      {/* Действия */}
      <Card mode="shadow">
        <Cell 
          before={<Icon28SettingsOutline />} 
          subtitle="Обновить данные из ВКонтакте"
          onClick={handleRefresh}
        >
          Обновить профиль
        </Cell>
        <Separator />
        <Cell 
          before={<Icon28UserOutline />} 
          subtitle="Выйти из аккаунта"
          onClick={handleLogout}
          style={{ color: '#e64646' }}
        >
          Выйти
        </Cell>
      </Card>
      
      {/* Индикатор загрузки при обновлении */}
      {loading && (
        <div style={{ textAlign: 'center', marginTop: 15 }}>
          <Spinner size="small" />
        </div>
      )}
    </Group>
  );
}

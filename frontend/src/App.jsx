// src/App.jsx
import { useState, useEffect } from 'react';
import { 
  AdaptivityProvider, AppRoot, SplitLayout, SplitCol, 
  View, Panel, PanelHeader, ConfigProvider, ruRU 
} from '@vkontakte/vkui';
import { Account } from './components/Account';
import { Feed } from './components/Feed'; // если есть лента
import { api } from './api/client';
import '@vkontakte/vkui/dist/vkui.css';

function App() {
  const [activePanel, setActivePanel] = useState('account');
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  // 🔁 Проверяем сохранённый токен при старте
  useEffect(() => {
    const token = localStorage.getItem('vhelp_token');
    const savedUser = localStorage.getItem('vhelp_user');
    
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('vhelp_user');
      }
    }
    setIsReady(true);
  }, []);
  
  // 🔄 Обновление данных пользователя
  const handleUserUpdate = (userData) => {
    setUser(userData);
  };
  
  // 🚪 Выход из аккаунта
  const handleLogout = () => {
    setUser(null);
    setActivePanel('account'); // остаёмся на том же экране
  };
  
  // Пока приложение не готово — показываем загрузку
  if (!isReady) {
    return (
      <ConfigProvider locale={ruRU}>
        <AdaptivityProvider>
          <AppRoot mode="embedded">
            <SplitLayout>
              <SplitCol>
                <View activePanel="loading">
                  <Panel id="loading" centered>
                    Загрузка...
                  </Panel>
                </View>
              </SplitCol>
            </SplitLayout>
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    );
  }
  
  return (
    <ConfigProvider locale={ruRU}>
      <AdaptivityProvider>
        <AppRoot mode="embedded">
          <SplitLayout header={false}>
            <SplitCol>
              <View activePanel={activePanel}>
                
                {/* 🔹 Панель: Аккаунт (автоматическая авторизация) */}
                <Panel id="account">
                  <PanelHeader>Аккаунт</PanelHeader>
                  <Account 
                    user={user} 
                    onUserUpdate={handleUserUpdate}
                    onLogout={handleLogout}
                  />
                </Panel>
                
                {/* 🔹 Панель: Лента (если есть) */}
                {user && (
                  <Panel id="feed">
                    <PanelHeader>Лента</PanelHeader>
                    <Feed user={user} />
                  </Panel>
                )}
                
              </View>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

export default App;

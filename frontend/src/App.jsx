// src/App.jsx
import { useState, useEffect } from 'react';
import { AdaptivityProvider, AppRoot, SplitLayout, SplitCol, View, Panel } from '@vkontakte/vkui';
import { Auth } from './components/Auth';
import { Feed } from './components/Feed';
import { api } from './api/client';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('vhelp_token');
    const savedUser = localStorage.getItem('vhelp_user');
    
    if (token && savedUser) {
      // Проверяем валидность токена на бэкенде
      api.getMe()
        .then(userData => {
          setUser(userData);
          localStorage.setItem('vhelp_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Токен невалиден — очищаем
          api.logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };
  
  if (loading) {
    return <AppRoot>Загрузка...</AppRoot>;
  }
  
  return (
    <AdaptivityProvider>
      <AppRoot>
        <SplitLayout>
          <SplitCol>
            <View activePanel={user ? 'feed' : 'auth'}>
              <Panel id="auth">
                <Auth onAuthSuccess={handleAuthSuccess} />
              </Panel>
              <Panel id="feed">
                <Feed user={user} />
              </Panel>
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    </AdaptivityProvider>
  );
}

export default App;

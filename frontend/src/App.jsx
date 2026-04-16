// src/App.jsx — ФИНАЛЬНАЯ ВЕРСИЯ (совместима с VKUI 7.x)
import { useState, useEffect } from 'react';
import { 
  AdaptivityProvider, AppRoot, SplitLayout, SplitCol, 
  View, Panel, PanelHeader, Spinner
  // ❌ Убрали Text — он может не существовать в вашей версии
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import { Account } from './components/Account';
// import { Feed } from './components/Feed';  // ← пока закомментируйте
import { api } from './api/client';

function App() {
  const [activePanel, setActivePanel] = useState('account');
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('vhelp_token');
    const savedUser = localStorage.getItem('vhelp_user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); } 
      catch (e) { localStorage.removeItem('vhelp_user'); }
    }
    setIsReady(true);
  }, []);
  
  const handleUserUpdate = (userData) => setUser(userData);
  const handleLogout = () => { setUser(null); api.logout(); };
  
  if (!isReady) {
    return (
      <AppRoot mode="embedded">
        <SplitLayout>
          <SplitCol>
            <View activePanel="loading">
              <Panel id="loading" centered>
                <div style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>
              </Panel>
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    );
  }
  
  return (
    <AdaptivityProvider>
      <AppRoot mode="embedded">
        <SplitLayout header={false}>
          <SplitCol>
            <View activePanel={activePanel}>
              <Panel id="account">
                <PanelHeader>Аккаунт</PanelHeader>
                {/* 🔥 Передаём user и хендлеры в Account */}
                <Account 
                  user={user} 
                  onUserUpdate={handleUserUpdate}
                  onLogout={handleLogout}
                />
              </Panel>
              
              {/* Feed пока закомментирован — раскомментируйте, когда почините FormItem */}
              {/* {user && (
                <Panel id="feed">
                  <PanelHeader>Лента</PanelHeader>
                  <Feed user={user} />
                </Panel>
              )} */}
              
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    </AdaptivityProvider>
  );
}

export default App;

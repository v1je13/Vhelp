// src/App.jsx — для VKUI 7.8.0
import { useState, useEffect } from 'react';
import { 
  AdaptivityProvider, AppRoot, SplitLayout, SplitCol, 
  View, Panel, PanelHeader, Text, Spinner, Button
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import { Account } from './components/Account';
import { Feed } from './components/Feed';
import { SearchBar } from './components/SearchBar';
import { api } from './api/client';

function App() {
  const [activePanel, setActivePanel] = useState('account');
  const [selectedPost, setSelectedPost] = useState(null);
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
                <Spinner size="large" />
                <Text style={{ marginTop: 10 }}>Загрузка...</Text>
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
              {/* 🔍 Панель поиска */}
              <Panel id="search">
                <PanelHeader>
                  <Button size="s" mode="secondary" onClick={() => setActivePanel('account')}>← Назад</Button>
                  Поиск
                </PanelHeader>
                <SearchBar 
                  onUserSelect={(user) => {
                    console.log('Выбран пользователь:', user);
                  }}
                  onPostSelect={(post) => {
                    setSelectedPost(post);
                    setActivePanel('feed');
                  }}
                />
              </Panel>
              
              <Panel id="account">
                <PanelHeader>
                  Аккаунт
                  <Button 
                    size="s" 
                    mode="secondary" 
                    onClick={() => setActivePanel('search')}
                    style={{ marginLeft: 10 }}
                  >
                    🔍
                  </Button>
                </PanelHeader>
                <Account 
                  user={user} 
                  onUserUpdate={handleUserUpdate}
                  onLogout={handleLogout}
                />
              </Panel>
              {user && (
                <Panel id="feed">
                  <PanelHeader>Лента</PanelHeader>
                  <Feed user={user} />
                </Panel>
              )}
            </View>
            
            {/* 🔥 Нижняя навигация */}
            {user && (
              <div style={{ 
                position: 'fixed', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                background: '#fff', 
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '8px 0',
                zIndex: 100
              }}>
                <Button 
                  mode={activePanel === 'account' ? 'primary' : 'secondary'} 
                  size="s"
                  onClick={() => setActivePanel('account')}
                  style={{ width: '45%' }}
                >
                  👤 Аккаунт
                </Button>
                <Button 
                  mode={activePanel === 'feed' ? 'primary' : 'secondary'} 
                  size="s"
                  onClick={() => setActivePanel('feed')}
                  style={{ width: '45%' }}
                >
                  📰 Лента
                </Button>
              </div>
            )}
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    </AdaptivityProvider>
  );
}

export default App;

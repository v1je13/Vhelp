// src/App.jsx — для VKUI 7.8.0
import { useState, useEffect } from 'react';
import { 
  AdaptivityProvider, AppRoot, SplitLayout, SplitCol, 
  View, Panel, PanelHeader, Text, Spinner, Button
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import { Feed } from './components/Feed';
import { PostDetail } from './components/PostDetail';
import { Profile } from './components/Profile';
import { Trips } from './components/Trips';
import { api } from './api/client';

function App() {
  const [activePanel, setActivePanel] = useState('account');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  
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
  
  // Открыть пост из профиля
  const handleOpenPost = (postId) => {
    setSelectedPostId(postId);
    setActivePanel('post-detail');
  };
  
  const handleClosePost = () => {
    setSelectedPostId(null);
    setActivePanel('feed');
  };

  const handleOpenTrip = (tripId) => {
    setSelectedTripId(tripId);
    setActivePanel('trips');
  };

  const handleCloseTrip = () => {
    setSelectedTripId(null);
    setActivePanel('trips');
  };

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
              {/* Профиль (заменил Account на Profile) */}
              <Panel id="account">
                <PanelHeader>Профиль</PanelHeader>
                {user && (
                  <Profile 
                    userId={user.id}
                    user={user}
                    onBack={() => {}}
                    onOpenPost={handleOpenPost}
                  />
                )}
              </Panel>
              
              {/* Лента постов */}
              <Panel id="feed">
                <PanelHeader>Лента</PanelHeader>
                <Feed 
                  user={user} 
                  onOpenPost={handleOpenPost}
                />
              </Panel>
              
              {/* Дневник путешествий */}
              <Panel id="trips">
                <Trips 
                  user={user}
                  onOpenTrip={handleOpenTrip}
                />
              </Panel>
              
              {/* Детальный просмотр поста */}
              <Panel id="post-detail">
                {selectedPostId && (
                  <PostDetail 
                    id={selectedPostId}
                    onBack={handleClosePost}
                    user={user}
                  />
                )}
              </Panel>
            </View>
            
            {/* Нижняя навигация */}
            {user && (
              <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'white',
                borderTop: '1px solid #e7e8ec',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '8px 0 12px',
                zIndex: 100
              }}>
                <button
                  onClick={() => setActivePanel('account')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: activePanel === 'account' ? '#0077FF' : '#818c99',
                    padding: 4
                  }}
                >
                  <span style={{ fontSize: 24 }}>👤</span>
                  <span style={{ fontSize: 11 }}>Профиль</span>
                </button>

                <button
                  onClick={() => setActivePanel('feed')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: activePanel === 'feed' ? '#0077FF' : '#818c99',
                    padding: 4
                  }}
                >
                  <span style={{ fontSize: 24 }}>📰</span>
                  <span style={{ fontSize: 11 }}>Лента</span>
                </button>

                <button
                  onClick={() => setActivePanel('trips')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: activePanel === 'trips' ? '#0077FF' : '#818c99',
                    padding: 4
                  }}
                >
                  <span style={{ fontSize: 24 }}>�</span>
                  <span style={{ fontSize: 11 }}>Дневник</span>
                </button>
              </div>
            )}
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    </AdaptivityProvider>
  );
}

export default App;

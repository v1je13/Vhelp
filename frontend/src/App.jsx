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
import { TripPosts } from './components/TripPosts';
import { TripNotes } from './components/TripNotes';
import { Auth } from './components/Auth';
import { api } from './api/client';
import { vk } from './lib/vk';

function App() {
  const [activePanel, setActivePanel] = useState('account');
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [authError, setAuthError] = useState(null);
  
  const showBottomNav = !!user;
  
  useEffect(() => {
    // Watchdog для App.jsx — если инициализация зависла, все равно показываем интерфейс через 6 секунд
    const appWatchdog = setTimeout(() => {
      if (!isReady) {
        console.warn('App: Initialization watchdog triggered');
        setIsReady(true);
      }
    }, 6000);

    const initApp = async () => {
      try {
        // 1. Проверяем localStorage
        const token = localStorage.getItem('vhelp_token');
        const savedUser = localStorage.getItem('vhelp_user');
        
        if (token && savedUser) {
          try { 
            setUser(JSON.parse(savedUser));
            setIsReady(true);
            vk.init().catch(e => console.warn('Background bridge init failed:', e));
            return;
          } catch (e) { 
            localStorage.removeItem('vhelp_user'); 
          }
        }

        // 2. Если нет токена, пробуем авто-авторизацию через VK
        const initData = await vk.init();
        console.log('App: initData received:', { 
          isEmbedded: initData.isEmbedded, 
          hasUser: !!initData.userData, 
          hasSign: !!initData.userData?.sign,
          error: initData.error 
        });
        
        if (initData.isEmbedded && initData.userData && initData.userData.sign) {
          console.log('App: Attempting auto-auth...');
          try {
            let response;
            for (let i = 0; i < 2; i++) {
              try {
                response = await api.vkAuth({
                  vk_user_id: initData.userData.vk_user_id,
                  sign: initData.userData.sign,
                  first_name: initData.userData.first_name,
                  last_name: initData.userData.last_name,
                  photo: initData.userData.photo
                });
                break;
              } catch (e) {
                if (i === 1) throw e;
                await new Promise(r => setTimeout(r, 2000));
              }
            }
            
            localStorage.setItem('vhelp_token', response.token);
            localStorage.setItem('vhelp_user', JSON.stringify(response.user));
            setUser(response.user);
            console.log('App: Auto-auth success');
          } catch (err) {
            console.error('App: Auto-auth failed', err);
            setAuthError(err.message || 'Не удалось автоматически авторизоваться');
            setActivePanel('auth'); 
          }
        } else {
          console.log('App: Manual auth mode or missing sign');
          setActivePanel('auth');
        }
      } catch (err) {
        console.error('App: Init error', err);
        setActivePanel('auth');
      } finally {
        clearTimeout(appWatchdog);
        setIsReady(true);
      }
    };

    initApp();
    return () => clearTimeout(appWatchdog);
  }, []);
  
  const handleAuthSuccess = (response) => {
    // Сохраняем данные при ручной авторизации
    if (response.token && response.user) {
      localStorage.setItem('vhelp_token', response.token);
      localStorage.setItem('vhelp_user', JSON.stringify(response.user));
      setUser(response.user);
    } else {
      setUser(response);
    }
    setActivePanel('account');
  };
  
  const handleLogout = () => { 
    setUser(null); 
    api.logout(); 
  };
  
  // Открыть пост из профиля
  const handleOpenPost = (postId) => {
    setSelectedPostId(postId);
  };

  const handleClosePost = () => {
    setSelectedPostId(null);
  };

  const handleOpenTrip = (tripId) => {
    setSelectedTripId(tripId);
    setActivePanel('trip-notes');
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
      <AppRoot mode="embedded" style={{ height: '100vh' }}>
        <SplitLayout 
          header={false}
          style={{ height: '100%' }}
        >
          <SplitCol 
            style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <View activePanel={activePanel} style={{ flex: 1 }}>
              {/* Авторизация */}
              <Panel id="auth">
                <PanelHeader>Авторизация</PanelHeader>
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: 20,
                  paddingBottom: '20%' 
                }}>
                  {authError && (
                    <div style={{ color: 'red', marginBottom: 20, textAlign: 'center' }}>
                      {authError}
                    </div>
                  )}
                  <Auth onAuthSuccess={handleAuthSuccess} />
                </div>
              </Panel>

              {/* Профиль (заменил Account на Profile) */}
              <Panel id="account">
                <PanelHeader 
                  after={user && (
                    <Button mode="tertiary" onClick={handleLogout} size="s">
                      Выйти
                    </Button>
                  )}
                >
                  Профиль
                </PanelHeader>
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
              
              {/* TripNotes - заметки путешествия */}
              <Panel id="trip-notes">
                {selectedTripId && (
                  <TripNotes 
                    tripId={selectedTripId}
                    onBack={() => {
                      setSelectedTripId(null);
                      setActivePanel('trips');
                    }}
                    user={user}
                  />
                )}
              </Panel>
            </View>

            {/* PostDetail - условный рендеринг */}
            {selectedPostId && (
              <Panel id="post-detail" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
                <PostDetail 
                  id={selectedPostId}
                  onBack={handleClosePost}
                  user={user}
                />
              </Panel>
            )}

            {/* Нижняя навигация */}
            {showBottomNav && (
              <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--vkui--color_background)',
                borderTop: '1px solid var(--vkui--color_separator_primary)',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
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

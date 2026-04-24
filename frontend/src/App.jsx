// src/App.jsx — для VKUI 7.8.0
import { useState, useEffect } from 'react';
import {
  AdaptivityProvider, AppRoot, SplitLayout, SplitCol,
  View, Panel, PanelHeader, Text, Spinner, Button,
  Textarea, Input
} from '@vkontakte/vkui';
import { Icon24Add, Icon24Camera, Icon24UserOutline, Icon24NewsfeedOutline, Icon24DocumentOutline } from '@vkontakte/icons';
import '@vkontakte/vkui/dist/vkui.css';
import './styles/travel-theme.css';

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
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showTripsModal, setShowTripsModal] = useState(false);

  // Feed modal state
  const [feedNewPost, setFeedNewPost] = useState('');
  const [feedSelectedPhotos, setFeedSelectedPhotos] = useState([]);
  const [feedPostTags, setFeedPostTags] = useState('');
  const [feedCreating, setFeedCreating] = useState(false);

  // Trips modal state
  const [tripsNewTripName, setTripsNewTripName] = useState('');
  const [tripsSelectedCover, setTripsSelectedCover] = useState(null);
  const [tripsCreating, setTripsCreating] = useState(false);
  const [tripsCreated, setTripsCreated] = useState(0);
  const [newTrip, setNewTrip] = useState(null);

  const showBottomNav = !!user;

  // Reset newTrip after it's been used by Trips component
  useEffect(() => {
    if (newTrip) {
      const timer = setTimeout(() => setNewTrip(null), 100);
      return () => clearTimeout(timer);
    }
  }, [newTrip]);

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
    setActivePanel('post-detail');
  };

  const handleClosePost = () => {
    setSelectedPostId(null);
    setActivePanel('feed');
  };

  const handleOpenTrip = (tripId) => {
    setSelectedTripId(tripId);
    setActivePanel('trip-notes');
  };

  const handleCloseTrip = () => {
    setSelectedTripId(null);
    setActivePanel('trips');
  };

  const handleCreateTrip = () => {
    setActivePanel('trips');
  };

  const handleFeedPostCreated = () => {
    // Trigger refresh in Feed by re-rendering
    setActivePanel('feed');
  };

  // Feed modal handlers
  const handleFeedPhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (feedSelectedPhotos.length + files.length > 3) {
      vk.showNotification('⚠️', 'Максимум 3 фото', 'warning');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate dimensions to fit within 800x800 while maintaining aspect ratio
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress with quality 0.7
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFeedSelectedPhotos(prev => [...prev, compressedDataUrl]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFeedRemovePhoto = (index) => {
    setFeedSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFeedCreatePost = async () => {
    if (!feedNewPost.trim() && feedSelectedPhotos.length === 0) return;

    try {
      setFeedCreating(true);
      await api.createPost({
        text: feedNewPost.trim(),
        images: feedSelectedPhotos,
        tags: feedPostTags.split(',').map(t => t.trim()).filter(t => t),
      });

      setFeedNewPost('');
      setFeedSelectedPhotos([]);
      setFeedPostTags('');
      setShowFeedModal(false);

      await vk.showNotification('✅', 'Пост опубликован', 'success');
      handleFeedPostCreated();
    } catch (err) {
      console.error('Create post error:', err);
      const errorMsg = err.message || 'Не удалось создать пост';
      await vk.showNotification('❌', errorMsg, 'error');
    } finally {
      setFeedCreating(false);
    }
  };

  // Trips modal handlers
  const handleTripsCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setTripsSelectedCover(reader.result);
    reader.readAsDataURL(file);
  };

  const handleTripsCreateTrip = async () => {
    if (!tripsNewTripName.trim()) return;

    try {
      setTripsCreating(true);
      const result = await api.createTrip({
        name: tripsNewTripName.trim(),
        cover_image: tripsSelectedCover,
      });

      setTripsNewTripName('');
      setTripsSelectedCover(null);
      setShowTripsModal(false);

      // Optimistic update - add trip immediately via callback
      if (result.trip) {
        setNewTrip(result.trip);
      }

      // Also trigger reload to ensure consistency
      setTripsCreated(prev => prev + 1);

      await vk.showNotification('✅', 'Путешествие создано', 'success');
    } catch (err) {
      console.error('Create trip error:', err);
      const errorMsg = err.message || 'Не удалось создать путешествие';
      await vk.showNotification('❌', errorMsg, 'error');
    } finally {
      setTripsCreating(false);
    }
  };

  if (!isReady) {
    return (
      <AppRoot mode="embedded">
        <SplitLayout>
          <SplitCol>
            <View activePanel="loading">
              <Panel id="loading" centered style={{ backgroundColor: '#F6F2E9' }}>
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
      <AppRoot
        mode="embedded"
        style={{
          height: '100vh',
          backgroundColor: '#F6F2E9',
          '--vkui--color_background': '#F6F2E9',
          '--vkui--color_background_content': '#F6F2E9',
        }}
      >
        <SplitLayout
          header={false}
          style={{
            height: '100%',
            backgroundColor: '#F6F2E9',
          }}
        >
          <SplitCol
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F6F2E9',
            }}
          >
            <View
              activePanel={activePanel}
              style={{
                flex: 1,
                backgroundColor: '#F6F2E9',
              }}
            >
              {/* Авторизация */}
              <Panel id="auth" style={{ backgroundColor: '#F6F2E9' }}>
                <PanelHeader style={{ backgroundColor: '#F6F2E9' }}>Авторизация</PanelHeader>
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
              <Panel id="account" style={{ backgroundColor: '#F6F2E9' }}>
                <PanelHeader 
                  style={{ backgroundColor: '#F6F2E9' }}
                  after={user && (
                    <Button mode="tertiary" onClick={handleLogout} size="s" className="vh-btn">
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
              <Panel id="feed" style={{ backgroundColor: '#F6F2E9' }}>
                <PanelHeader style={{ backgroundColor: '#F6F2E9' }}>Лента</PanelHeader>
                <Feed
                  user={user}
                  onOpenPost={handleOpenPost}
                  onCreateTrip={handleCreateTrip}
                  onPostCreated={handleFeedPostCreated}
                />
              </Panel>
              
              {/* Дневник путешествий */}
              <Panel id="trips" style={{ backgroundColor: '#F6F2E9' }}>
                <Trips
                  user={user}
                  onOpenTrip={handleOpenTrip}
                  onTripCreated={tripsCreated}
                  newTrip={newTrip}
                />
              </Panel>
              
              {/* TripNotes - заметки путешествия */}
              <Panel id="trip-notes" style={{ backgroundColor: '#F6F2E9' }}>
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

              {/* PostDetail Panel */}
              {selectedPostId && (
                <Panel id="post-detail" style={{ backgroundColor: '#F6F2E9' }}>
                  <PostDetail
                    id={selectedPostId}
                    onBack={handleClosePost}
                    user={user}
                  />
                </Panel>
              )}
            </View>

            {/* Нижняя навигация */}
            {showBottomNav && activePanel !== 'post-detail' && (
              <div className="vh-bottom-nav" style={{
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
                  className={`vh-bottom-nav__item ${activePanel === 'account' ? 'vh-bottom-nav__item--active' : ''}`}
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
                    color: activePanel === 'account' ? '#000000' : '#000000',
                    padding: 4
                  }}
                >
                  <Icon24UserOutline width={24} height={24} />
                  <span style={{ fontSize: 11 }}>Профиль</span>
                </button>

                <button
                  className={`vh-bottom-nav__item ${activePanel === 'feed' ? 'vh-bottom-nav__item--active' : ''}`}
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
                    color: activePanel === 'feed' ? '#000000' : '#000000',
                    padding: 4
                  }}
                >
                  <Icon24NewsfeedOutline width={24} height={24} />
                  <span style={{ fontSize: 11 }}>Лента</span>
                </button>

                <button
                  className={`vh-bottom-nav__item ${activePanel === 'trips' ? 'vh-bottom-nav__item--active' : ''}`}
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
                    color: activePanel === 'trips' ? '#000000' : '#000000',
                    padding: 4
                  }}
                >
                  <Icon24DocumentOutline width={24} height={24} />
                  <span style={{ fontSize: 11 }}>Дневник</span>
                </button>
              </div>
            )}
          </SplitCol>

        {/* FAB Buttons */}
        {activePanel === 'feed' && (
          <Button
            mode="primary"
            before={<Icon24Add />}
            onClick={() => {
              setFeedNewPost('');
              setFeedSelectedPhotos([]);
              setFeedPostTags('');
              setFeedCreating(false);
              setShowFeedModal(true);
            }}
            className="vh-btn vh-fab"
            style={{
              position: 'fixed',
              bottom: 100,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              padding: 0,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        )}
        {activePanel === 'trips' && (
          <Button
            mode="primary"
            before={<Icon24Add />}
            onClick={() => {
              setTripsNewTripName('');
              setTripsSelectedCover(null);
              setTripsCreating(false);
              setShowTripsModal(true);
            }}
            className="vh-btn vh-fab"
            style={{
              position: 'fixed',
              bottom: 100,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              padding: 0,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        )}

        {/* Feed Post Creation Modal */}
        {showFeedModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => !feedCreating && setShowFeedModal(false)}
          >
            <div
              className="vh-modal"
              style={{
                backgroundColor: 'var(--vkui--color_background_content)',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="vh-modal__title" style={{ margin: 0 }}>Новый пост</h2>
                <Button mode="secondary" size="s" disabled={feedCreating} onClick={() => setShowFeedModal(false)} className="vh-btn vh-modal__close-btn">✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Textarea
                  className="vh-modal__textarea"
                  value={feedNewPost}
                  onChange={e => setFeedNewPost(e.target.value)}
                  placeholder="Напишите что-нибудь..."
                  rows={4}
                  disabled={feedCreating}
                />

                <div
                  style={{
                    width: '100%',
                    height: 150,
                    borderRadius: 12,
                    border: '2px dashed var(--vkui--color_separator_primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: feedCreating ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {feedSelectedPhotos.length > 0 ? (
                    <div style={{ width: '100%', height: '100%', overflowX: 'auto', display: 'flex', gap: 8, padding: 8 }}>
                      {feedSelectedPhotos.map((photo, index) => (
                        <div key={index} style={{ position: 'relative', flexShrink: 0, width: 120, height: 120 }}>
                          <img src={photo} alt={`Photo ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                          <Button
                            mode="destructive"
                            size="s"
                            onClick={() => handleFeedRemovePhoto(index)}
                            className="vh-btn"
                            style={{ position: 'absolute', top: 4, right: 4, padding: 4, minWidth: 'auto', width: 24, height: 24 }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {feedSelectedPhotos.length < 3 && (
                        <div
                          style={{
                            width: 120,
                            height: 120,
                            borderRadius: 8,
                            border: '2px dashed var(--vkui--color_separator_primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: feedCreating ? 'default' : 'pointer',
                            flexShrink: 0
                          }}
                          onClick={() => document.getElementById('feed-photo-upload')?.click()}
                        >
                          <Icon24Camera />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }} onClick={() => document.getElementById('feed-photo-upload')?.click()}>
                      <Icon24Camera style={{ margin: '0 auto 8px' }} />
                      <div>Добавить фото (до 3)</div>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" multiple onChange={handleFeedPhotoUpload} style={{ display: 'none' }} id="feed-photo-upload" />

                <div>
                  <Input
                    className="vh-modal__input"
                    value={feedPostTags}
                    onChange={e => setFeedPostTags(e.target.value)}
                    placeholder="Тэги через запятую (например: Сочи, Лето)"
                    disabled={feedCreating}
                  />
                </div>

                <Button
                  mode="primary"
                  onClick={handleFeedCreatePost}
                  disabled={feedCreating || (!feedNewPost.trim() && feedSelectedPhotos.length === 0)}
                  loading={feedCreating}
                  stretched
                  size="l"
                  className="vh-btn"
                >
                  Опубликовать
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Trips Creation Modal */}
        {showTripsModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => !tripsCreating && setShowTripsModal(false)}
          >
            <div
              className="vh-modal"
              style={{
                backgroundColor: 'var(--vkui--color_background_content)',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="vh-modal__title" style={{ margin: 0 }}>Новое путешествие</h2>
                <Button mode="secondary" size="s" disabled={tripsCreating} onClick={() => setShowTripsModal(false)} className="vh-btn vh-modal__close-btn">✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  className="vh-modal__input"
                  value={tripsNewTripName}
                  onChange={e => setTripsNewTripName(e.target.value)}
                  placeholder="Название путешествия"
                  disabled={tripsCreating}
                />

                <div
                  onClick={() => !tripsCreating && document.getElementById('trips-cover-upload')?.click()}
                  style={{
                    width: '100%',
                    height: 150,
                    borderRadius: 12,
                    border: '2px dashed var(--vkui--color_separator_primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: tripsCreating ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {tripsSelectedCover ? (
                    <img src={tripsSelectedCover} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                      <Icon24Camera style={{ margin: '0 auto 8px' }} />
                      <div>Добавить обложку</div>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleTripsCoverUpload} style={{ display: 'none' }} id="trips-cover-upload" />

                <Button
                  mode="primary"
                  onClick={handleTripsCreateTrip}
                  disabled={tripsCreating || !tripsNewTripName.trim()}
                  loading={tripsCreating}
                  stretched
                  size="l"
                  className="vh-btn"
                >
                  Создать путешествие
                </Button>
              </div>
            </div>
          </div>
        )}
      </SplitLayout>
      </AppRoot>
    </AdaptivityProvider>
  );
}

export default App;

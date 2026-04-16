// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Avatar, 
  Text, 
  Button,
  Spinner,
  Placeholder,
  Separator,
  HorizontalScroll
} from '@vkontakte/vkui';
import { api } from '../api/client';

export function Profile({ userId, user, onBack, onOpenPost }) {
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // posts, friends, subscribers

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Если userId не передан, используем текущего пользователя
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) {
          throw new Error('User ID not provided');
        }

        // Загружаем профиль и посты
        const [profileResponse, postsResponse] = await Promise.all([
          api.getUserProfile(targetUserId),
          api.getUserPosts(targetUserId)
        ]);

        setProfileData(profileResponse.user || profileResponse);
        setPosts(postsResponse.posts || []);
        
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, user?.id]);

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const timestamp = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime();
    if (isNaN(timestamp)) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Panel id="profile" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader 
          left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}
        >
          Профиль
        </PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  if (!profileData) {
    return (
      <Panel id="profile" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader 
          left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}
        >
          Профиль не найден
        </PanelHeader>
        <Placeholder>Пользователь не найден</Placeholder>
      </Panel>
    );
  }

  const isOwnProfile = profileData.id === user?.id;

  return (
    <Panel id="profile" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PanelHeader 
        left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}
      >
        {profileData.first_name} {profileData.last_name}
      </PanelHeader>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '80px',
        padding: 0
      }}>
        {/* Шапка профиля */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <Avatar 
            src={profileData.avatar || 'https://vk.com/images/camera_200.png'} 
            size={96}
            style={{ marginBottom: 12, border: '4px solid white' }}
          />
          <Text weight="2" style={{ fontSize: 22, marginBottom: 4 }}>
            {profileData.first_name} {profileData.last_name}
          </Text>
          {profileData.bio && (
            <Text style={{ opacity: 0.9, fontSize: 14 }}>
              {profileData.bio}
            </Text>
          )}
        </div>

        {/* Статистика: Друзья / Подписчики */}
        <div style={{ 
          display: 'flex', 
          padding: '15px',
          borderBottom: '1px solid #e7e8ec'
        }}>
          <div 
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '10px',
              cursor: 'pointer',
              background: activeTab === 'friends' ? '#f0f2f5' : 'transparent',
              borderRadius: 8
            }}
            onClick={() => setActiveTab('friends')}
          >
            <Text weight="2" style={{ fontSize: 20 }}>
              {profileData.friends_count || 0}
            </Text>
            <Text caption style={{ color: '#818c99' }}>
              Друзья
            </Text>
          </div>
          
          <Separator style={{ margin: '0 10px' }} />
          
          <div 
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '10px',
              cursor: 'pointer',
              background: activeTab === 'subscribers' ? '#f0f2f5' : 'transparent',
              borderRadius: 8
            }}
            onClick={() => setActiveTab('subscribers')}
          >
            <Text weight="2" style={{ fontSize: 20 }}>
              {profileData.subscribers_count || 0}
            </Text>
            <Text caption style={{ color: '#818c99' }}>
              Подписчики
            </Text>
          </div>
        </div>

        {/* Кнопки действий (если не свой профиль) */}
        {!isOwnProfile && (
          <div style={{ padding: '15px', display: 'flex', gap: 8 }}>
            <Button mode="primary" stretched>
              Добавить в друзья
            </Button>
            <Button mode="secondary" stretched>
              Написать
            </Button>
          </div>
        )}

        {/* Вкладки */}
        <HorizontalScroll>
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            padding: '10px 15px',
            borderBottom: '1px solid #e7e8ec'
          }}>
            {['posts', 'friends', 'subscribers'].map(tab => (
              <Button
                key={tab}
                mode={activeTab === tab ? 'primary' : 'secondary'}
                size="s"
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'posts' && 'Посты'}
                {tab === 'friends' && 'Друзья'}
                {tab === 'subscribers' && 'Подписчики'}
              </Button>
            ))}
          </div>
        </HorizontalScroll>

        {/* Контент вкладок */}
        <div style={{ padding: 10 }}>
          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <Placeholder header="Нет постов">
                  {isOwnProfile ? 'Будьте первым, кто создаст пост!' : 'Пользователь ещё не публиковал посты'}
                </Placeholder>
              ) : (
                posts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => onOpenPost?.(post.id)}
                    style={{
                      background: 'white',
                      borderRadius: 8,
                      padding: 15,
                      marginBottom: 10,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Шапка поста */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <Avatar 
                        src={post.avatar || profileData.avatar} 
                        size={40}
                      />
                      <div>
                        <Text weight="2" style={{ fontSize: 14 }}>
                          {post.first_name || profileData.first_name} {post.last_name || profileData.last_name}
                        </Text>
                        <Text caption style={{ color: '#818c99', fontSize: 12 }}>
                          {formatDate(post.created_at)}
                        </Text>
                      </div>
                    </div>

                    {/* Текст */}
                    <Text style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                      {post.text}
                    </Text>

                    {/* Фото */}
                    {post.images && post.images !== '[]' && (
                      <div>
                        {(() => {
                          try {
                            const urls = typeof post.images === 'string' 
                              ? JSON.parse(post.images) 
                              : post.images;
                            if (Array.isArray(urls) && urls.length > 0) {
                              return urls.slice(0, 3).map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt=""
                                  style={{
                                    width: '100%',
                                    maxHeight: 300,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    marginBottom: idx < urls.length - 1 ? 8 : 0
                                  }}
                                />
                              ));
                            }
                          } catch { return null; }
                        })()}
                      </div>
                    )}

                    {/* Лайки */}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>❤️</span>
                      <Text caption>{post.likes_count || 0}</Text>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'friends' && (
            <Placeholder header="Друзья">
              Список друзей будет здесь
            </Placeholder>
          )}

          {activeTab === 'subscribers' && (
            <Placeholder header="Подписчики">
              Список подписчиков будет здесь
            </Placeholder>
          )}
        </div>
      </div>
    </Panel>
  );
}

// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import {
  Avatar,
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
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // posts, friends, subscribers

  useEffect(() => {
    // Увеличиваем до 40 секунд для мобильного интернета
    const profileWatchdog = setTimeout(() => {
      if (loading) {
        console.warn('Profile: Watchdog triggered');
        setLoading(false);
        setError('Загрузка профиля занимает слишком много времени. Проверьте соединение.');
      }
    }, 40000);

    const loadProfile = async (retryCount = 0) => {
      try {
        setLoading(true);
        setError(null);
        
        const targetUserId = userId || user?.id;
        if (!targetUserId) {
          setLoading(false);
          return;
        }

        console.log('Profile: Loading for', targetUserId, 'attempt', retryCount + 1);

        // На мобильном интернете лучше грузить последовательно, чтобы не делить канал
        const profileData = await api.getUser(targetUserId);
        setProfileData(profileData.user || profileData);

        try {
          const postsData = await api.getUserPosts(targetUserId);
          setPosts(postsData.posts || []);
        } catch (e) {
          console.warn('Profile: Posts failed to load, but profile is OK');
        }

      } catch (err) {
        console.error('Profile error:', err);
        // Авто-повтор один раз через 3 секунды
        if (retryCount < 1) {
          setTimeout(() => loadProfile(retryCount + 1), 3000);
          return;
        }
        setError(err.message || 'Не удалось загрузить данные');
      } finally {
        clearTimeout(profileWatchdog);
        setLoading(false);
      }
    };

    loadProfile();
    return () => clearTimeout(profileWatchdog);
  }, [userId, user?.id]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        textAlign: 'center'
      }}>
        <Spinner size="large" />
        <div style={{ marginTop: 16, color: 'var(--vkui--color_text_secondary)' }}>
          Загружаем ваш профиль...
        </div>
        <div style={{ marginTop: 8, color: 'var(--vkui--color_text_tertiary)', fontSize: 13 }}>
          Это может занять до минуты при слабом соединении
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <Placeholder
        header={error || "Профиль не найден"}
        action={<Button size="m" onClick={() => window.location.reload()}>Обновить</Button>}
      >
        {error ? "Попробуйте позже" : "Пользователь не найден"}
      </Placeholder>
    );
  }

  const isOwnProfile = profileData.id === user?.id;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Шапка профиля */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px 20px',
        textAlign: 'center',
        color: 'white'
      }}>
        <Avatar
          src={profileData.avatar || 'https://vk.com/images/camera_200.png'}
          size={96}
          style={{ marginBottom: 12, border: '4px solid white', margin: '0 auto' }}
        />
        <div style={{ fontSize: 22, marginBottom: 4, fontWeight: 700 }}>
          {profileData.first_name} {profileData.last_name}
        </div>
        {profileData.bio && (
          <div style={{ opacity: 0.9, fontSize: 14 }}>
            {profileData.bio}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div style={{
        display: 'flex',
        padding: '15px',
        borderBottom: '1px solid var(--vkui--color_separator_primary)'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {posts.length}
          </div>
          <div style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
            Посты
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {profileData.friends_count || 0}
          </div>
          <div style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
            Друзья
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <HorizontalScroll>
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          padding: '10px 15px',
          borderBottom: '1px solid var(--vkui--color_separator_primary)'
        }}>
          {['posts', 'friends'].map(tab => (
            <Button
              key={tab}
              mode={activeTab === tab ? 'primary' : 'secondary'}
              size="s"
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'posts' && 'Посты'}
              {tab === 'friends' && 'Друзья'}
            </Button>
          ))}
        </div>
      </HorizontalScroll>

      {/* Контент */}
      <div style={{ padding: 10 }}>
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <Placeholder header="Нет постов">
                {isOwnProfile ? 'Будьте первым, кто создаст пост!' : 'Пользователь ещё не публиковал посты'}
              </Placeholder>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => onOpenPost?.(post.id)}
                    style={{ 
                      aspectRatio: '1/1', 
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      backgroundImage: post.images && post.images.length > 3 ? `url(${JSON.parse(post.images)[0]})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

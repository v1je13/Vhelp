// src/components/PostDetail.jsx
import { useState, useEffect } from 'react';
import {
  PanelHeader,
  Avatar,
  Text,
  Button,
  Spinner,
  Input,
  Placeholder,
  Alert
} from '@vkontakte/vkui';
import { Icon28ChevronLeft, Icon24DeleteOutline } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function PostDetail({ id, onBack, user }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        // Загружаем пост и комментарии
        const [postData, commentsData] = await Promise.all([
          api.getPostById(id),
          api.getComments(id)
        ]);
        
        setPost(postData.post || postData);
        setComments(commentsData.comments || []);
      } catch (err) {
        console.error('Failed to load post:', err);
        await vk.showNotification('❌', 'Не удалось загрузить пост', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadPost();
  }, [id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const { comment } = await api.createComment(id, commentText);

      setComments(prev => [...prev, comment]);
      setCommentText('');

      await vk.showNotification('✅', 'Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Comment error:', err);
      await vk.showNotification('❌', 'Не удалось добавить комментарий', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user || post.user_id !== user.id) {
      await vk.showNotification('❌', 'Вы можете удалять только свои посты', 'error');
      return;
    }

    const confirmed = await new Promise((resolve) => {
      Alert.show('Удалить пост?', 'Это действие нельзя отменить', [
        { title: 'Отмена', action: () => resolve(false) },
        { title: 'Удалить', action: () => resolve(true), mode: 'destructive' }
      ]);
    });

    if (!confirmed) return;

    try {
      await api.deletePost(id);
      await vk.showNotification('✅', 'Пост удален', 'success');
      onBack();
    } catch (err) {
      console.error('Delete post error:', err);
      await vk.showNotification('❌', 'Не удалось удалить пост', 'error');
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Только что';
    const timestamp = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime();
    if (isNaN(timestamp) || timestamp < 0) return 'Только что';
    
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
      <>
        <PanelHeader before={<Button mode="tertiary" onClick={onBack} size="s">← Назад</Button>}>
          Загрузка...
        </PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <PanelHeader before={<Button mode="tertiary" onClick={onBack} size="s">← Назад</Button>}>
          Пост не найден
        </PanelHeader>
        <Placeholder>Пост не найден</Placeholder>
      </>
    );
  }

  return (
    <>
      <PanelHeader
        before={<Button mode="tertiary" onClick={onBack} size="s">← Назад</Button>}
        right={user && post.user_id === user.id && (
          <Button mode="secondary" size="s" before={<Icon24DeleteOutline />} onClick={handleDeletePost}>
            Удалить
          </Button>
        )}
      >
        Пост
      </PanelHeader>
      
      <div style={{ padding: 15 }}>
        {/* 🔥 Шапка поста: автор и дата */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <Avatar 
            src={post.avatar || 'https://vk.com/images/camera_200.png'} 
            size={48}
          />
          <div style={{ flex: 1 }}>
            <Text weight="2" style={{ fontSize: 16 }}>
              {post.first_name || 'Пользователь'} {post.last_name || ''}
            </Text>
            <Text caption style={{ color: '#818c99', fontSize: 13 }}>
              {formatDate(post.created_at)}
            </Text>
          </div>
        </div>

        {/* 🔥 Фото поста (полный размер) */}
        {post.images && post.images !== '[]' && post.images !== 'null' && (
          <div style={{ marginBottom: 15, overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 8 }}>
            {(() => {
              try {
                const imageUrls = typeof post.images === 'string'
                  ? JSON.parse(post.images)
                  : post.images;

                if (Array.isArray(imageUrls) && imageUrls.length > 0) {
                  return imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Post image ${idx + 1}`}
                      style={{ flexShrink: 0, width: 250, height: 250, objectFit: 'cover', borderRadius: 12 }}
                      onError={(e) => {
                        console.error('Failed to load image:', url);
                        e.target.style.display = 'none';
                      }}
                    />
                  ));
                }
                return null;
              } catch (err) {
                console.error('Error parsing images:', err);
                return null;
              }
            })()}
          </div>
        )}

        {/* 🔥 Описание поста */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 15 }}>
            Описание
          </Text>
          <Text style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: 1.5,
            fontSize: 15
          }}>
            {post.text || 'Нет описания'}
          </Text>
        </div>

        {/* 🔥 Разделитель */}
        <hr style={{ 
          border: 'none', 
          borderTop: '1px solid #e7e8ec',
          margin: '20px 0'
        }} />

        {/* 🔥 Комментарии */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 15, fontSize: 16 }}>
            Комментарии ({comments.length})
          </Text>
          
          {/* Список комментариев */}
          {comments.length === 0 ? (
            <Placeholder 
              header="Пока нет комментариев"
              style={{ padding: '20px 0' }}
            >
              Будьте первым, кто прокомментирует!
            </Placeholder>
          ) : (
            <div style={{ marginBottom: 15 }}>
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="vh-comment"
                >
                  <Avatar
                    src={comment.avatar || 'https://vk.com/images/camera_200.png'}
                    size={40}
                    className="vh-comment__avatar"
                  />
                  <div className="vh-comment__content">
                    <div className="vh-comment__header">
                      <Text weight="2" className="vh-comment__name">
                        {comment.first_name} {comment.last_name}
                      </Text>
                      <Text caption className="vh-comment__date">
                        {formatDate(comment.created_at)}
                      </Text>
                    </div>
                    <Text className="vh-comment__text">
                      {comment.text}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Форма добавления комментария */}
          <div style={{ 
            display: 'flex', 
            gap: 8,
            position: 'sticky',
            bottom: 0,
            background: 'white',
            padding: '12px 0',
            borderTop: '1px solid #e7e8ec'
          }}>
            <Input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Написать комментарий..."
              style={{ flex: 1 }}
              disabled={submitting}
            />
            <Button 
              mode="primary" 
              size="s"
              onClick={handleAddComment}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? <Spinner size="small" /> : '➤'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

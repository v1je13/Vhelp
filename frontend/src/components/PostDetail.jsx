// src/components/PostDetail.jsx
import { useState, useEffect, useRef } from 'react';
import {
  PanelHeader,
  Avatar,
  Text,
  Button,
  Spinner,
  Input,
  Placeholder,
  Alert,
  Textarea
} from '@vkontakte/vkui';
import { Icon28ChevronLeft, Icon24DeleteOutline, Icon24Camera } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function PostDetail({ id, onBack, user }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [editPhotos, setEditPhotos] = useState([]);
  const [editing, setEditing] = useState(false);
  const commentInputRef = useRef(null);

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

      // Force input to reset
      if (commentInputRef.current) {
        commentInputRef.current.value = '';
      }

      await vk.showNotification('✅', 'Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Comment error:', err);
      await vk.showNotification('❌', 'Не удалось добавить комментарий', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePost = async () => {
    try {
      setEditing(true);
      await api.updatePost(id, {
        text: editText,
        images: editPhotos
      });

      setPost(prev => ({ ...prev, text: editText, images: JSON.stringify(editPhotos) }));
      setShowEditModal(false);
      await vk.showNotification('✅', 'Пост обновлен', 'success');
    } catch (err) {
      console.error('Update post error:', err);
      await vk.showNotification('❌', 'Не удалось обновить пост', 'error');
    } finally {
      setEditing(false);
    }
  };

  const handleRemoveEditPhoto = (index) => {
    setEditPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditPhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
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
        <PanelHeader before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}>
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
        <PanelHeader before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}>
          Пост не найден
        </PanelHeader>
        <Placeholder>Пост не найден</Placeholder>
      </>
    );
  }

  return (
    <>
      <PanelHeader
        before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}
        right={user && post.user_id === user.id && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button mode="secondary" size="s" onClick={() => {
              setEditText(post.text || '');
              setEditPhotos(post.images && typeof post.images === 'string' ? JSON.parse(post.images) : (post.images || []));
              setShowEditModal(true);
            }} className="vh-btn">
              Редактировать
            </Button>
            <Button mode="secondary" size="s" before={<Icon24DeleteOutline />} onClick={handleDeletePost} className="vh-btn">
              Удалить
            </Button>
          </div>
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
          <div className="vh-comment-form">
            <Input
              getRef={commentInputRef}
              className="vh-comment-form__input"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Написать комментарий..."
              disabled={submitting}
            />
            <Button
              mode="primary"
              size="s"
              onClick={handleAddComment}
              disabled={!commentText.trim() || submitting}
              className="vh-comment-form__button"
            >
              {submitting ? <Spinner size="small" /> : 'Отправить'}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
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
          onClick={() => !editing && setShowEditModal(false)}
        >
          <div
            className="vh-modal"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="vh-modal__title" style={{ margin: 0 }}>Редактировать пост</h2>
              <Button mode="secondary" size="s" disabled={editing} onClick={() => setShowEditModal(false)} className="vh-btn vh-modal__close-btn">✕</Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Textarea
                className="vh-modal__textarea"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                placeholder="Описание..."
                rows={4}
                disabled={editing}
              />

              {/* Превью фото */}
              {editPhotos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                  {editPhotos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative', flexShrink: 0, width: 100, height: 100 }}>
                      <img
                        src={photo}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      />
                      <Button
                        mode="secondary"
                        size="s"
                        onClick={() => handleRemoveEditPhoto(index)}
                        className="vh-btn"
                        style={{ position: 'absolute', top: 4, right: 4, padding: 4, minWidth: 'auto', width: 24, height: 24 }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {editPhotos.length < 3 && (
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        border: '2px dashed #E8E4DB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: editing ? 'default' : 'pointer',
                        flexShrink: 0
                      }}
                      onClick={() => document.getElementById('edit-photo-upload')?.click()}
                    >
                      <Icon24Camera />
                    </div>
                  )}
                </div>
              )}

              {/* Кнопка загрузки фото */}
              {editPhotos.length === 0 && (
                <div
                  onClick={() => !editing && document.getElementById('edit-photo-upload')?.click()}
                  style={{
                    width: '100%',
                    height: 120,
                    borderRadius: 12,
                    border: '2px dashed #E8E4DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: editing ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div style={{ textAlign: 'center', color: '#6B7280' }}>
                    <Icon24Camera style={{ margin: '0 auto 8px' }} />
                    <div>Добавить фото (до 3)</div>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleEditPhotoUpload} style={{ display: 'none' }} id="edit-photo-upload" />

              <Button
                mode="primary"
                onClick={handleUpdatePost}
                disabled={editing}
                loading={editing}
                stretched
                size="l"
                className="vh-btn"
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

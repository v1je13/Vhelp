// src/components/TripNoteEdit.jsx
import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Button,
  Spinner,
  Textarea,
  Avatar,
  Text,
  Placeholder
} from '@vkontakte/vkui';
import { Icon24Camera, Icon24DeleteOutline } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function TripNoteEdit({ id, tripId, onBack, user }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editText, setEditText] = useState('');
  const [editPhotos, setEditPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadNote = async () => {
      try {
        setLoading(true);
        const postData = await api.getPostById(id);
        setNote(postData.post || postData);
        setEditText(postData.post?.text || postData.text || '');
        setEditPhotos(
          postData.post?.images && typeof postData.post.images === 'string'
            ? JSON.parse(postData.post.images)
            : (postData.post?.images || postData.images || [])
        );
      } catch (err) {
        console.error('Failed to load note:', err);
        await vk.showNotification('❌', 'Не удалось загрузить заметку', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updatePost(id, {
        text: editText,
        images: editPhotos
      });

      setNote(prev => ({ ...prev, text: editText, images: JSON.stringify(editPhotos) }));
      await vk.showNotification('✅', 'Заметка обновлена', 'success');
      onBack();
    } catch (err) {
      console.error('Update note error:', err);
      await vk.showNotification('❌', 'Не удалось обновить заметку', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || note.user_id !== user.id) {
      await vk.showNotification('❌', 'Вы можете удалять только свои заметки', 'error');
      return;
    }

    const confirmed = await new Promise((resolve) => {
      if (window.confirm('Удалить заметку? Это действие нельзя отменить.')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    if (!confirmed) return;

    try {
      await api.deletePost(id);
      await vk.showNotification('✅', 'Заметка удалена', 'success');
      onBack();
    } catch (err) {
      console.error('Delete note error:', err);
      await vk.showNotification('❌', 'Не удалось удалить заметку', 'error');
    }
  };

  const handleRemovePhoto = (index) => {
    setEditPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPhotos([reader.result]);
    };
    reader.readAsDataURL(file);
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
      <Panel id="trip-note-edit">
        <PanelHeader before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}>
          Загрузка...
        </PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  if (!note) {
    return (
      <Panel id="trip-note-edit">
        <PanelHeader before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}>
          Заметка не найдена
        </PanelHeader>
        <Placeholder>Заметка не найдена</Placeholder>
      </Panel>
    );
  }

  return (
    <Panel id="trip-note-edit">
      <PanelHeader
        before={<Button mode="secondary" onClick={onBack} size="m" className="vh-btn">← Назад</Button>}
        right={user && note.user_id === user.id && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button mode="primary" size="s" onClick={handleSave} disabled={saving} loading={saving} className="vh-btn">
              Сохранить
            </Button>
            <Button mode="secondary" size="s" before={<Icon24DeleteOutline />} onClick={handleDelete} className="vh-btn">
              Удалить
            </Button>
          </div>
        )}
      >
        Редактирование заметки
      </PanelHeader>

      <div style={{ padding: 15, paddingBottom: 100 }}>
        {/* Шапка заметки: автор и дата */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <Avatar
            src={note.avatar || 'https://vk.com/images/camera_200.png'}
            size={48}
          />
          <div style={{ flex: 1 }}>
            <Text weight="2" style={{ fontSize: 16 }}>
              {note.first_name || 'Пользователь'} {note.last_name || ''}
            </Text>
            <Text caption style={{ color: '#818c99', fontSize: 13 }}>
              {formatDate(note.created_at)}
            </Text>
          </div>
        </div>

        {/* Фото */}
        <div style={{ marginBottom: 15 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 15 }}>
            Фото
          </Text>
          {editPhotos.length > 0 ? (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img
                src={editPhotos[0]}
                alt="Preview"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 12 }}
              />
              <Button
                mode="secondary"
                size="s"
                onClick={() => setEditPhotos([])}
                className="vh-btn"
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)' }}
              >
                ✕
              </Button>
            </div>
          ) : (
            <div
              onClick={() => !saving && document.getElementById('note-photo-upload')?.click()}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12,
                border: '2px dashed #E8E4DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'center', color: '#6B7280' }}>
                <Icon24Camera style={{ margin: '0 auto 8px' }} />
                <div>Добавить фото</div>
              </div>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} id="note-photo-upload" />
        </div>

        {/* Текст */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 15 }}>
            Описание
          </Text>
          <Textarea
            className="vh-modal__textarea"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            placeholder="Описание..."
            rows={6}
            disabled={saving}
          />
        </div>

        {/* Кнопка сохранения внизу */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px calc(16px + env(safe-area-inset-bottom))',
          backgroundColor: '#F6F2E9',
          borderTop: '1px solid #E8E4DB',
          zIndex: 100
        }}>
          <Button
            mode="primary"
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            stretched
            size="l"
            className="vh-btn"
          >
            Сохранить изменения
          </Button>
        </div>
      </div>
    </Panel>
  );
}

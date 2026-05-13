import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Button,
  Spinner,
  Placeholder,
  Avatar,
  Text,
  Textarea,
  Card,
  Input,
  Banner
} from '@vkontakte/vkui';
import { Icon24Add, Icon24Camera, Icon24DeleteOutline, Icon24Cancel } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function TripNotes({ tripId, onBack, user, onOpenPost, onOpenNoteEdit, refreshTrigger }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTripName, setEditTripName] = useState('');
  const [editTripDescription, setEditTripDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [tripId, refreshTrigger]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getTripNotes(tripId);
      setNotes(data.notes || data.posts || []);
      
      // Получаем название и описание путешествия
      const tripsData = await api.getUserTrips();
      const trip = tripsData.trips?.find(t => t.id === tripId);
      if (trip) {
        setTripName(trip.name);
        setTripDescription(trip.description || '');
        setEditTripName(trip.name);
        setEditTripDescription(trip.description || '');
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Обновление информации о путешествии
  const handleUpdateTrip = async () => {
    if (!editTripName.trim()) return;

    try {
      setUpdating(true);
      await api.updateTrip(tripId, {
        name: editTripName.trim(),
        description: editTripDescription.trim()
      });
      
      setTripName(editTripName.trim());
      setTripDescription(editTripDescription.trim());
      setShowEditModal(false);
      await vk.showNotification('✅', 'Путешествие обновлено', 'success');
    } catch (err) {
      console.error('Update trip error:', err);
      await vk.showNotification('❌', 'Не удалось обновить путешествие', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // 🔥 Удаление заметки
  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    
    try {
      await api.deletePost(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      await vk.showNotification('✅', 'Заметка удалена', 'success');
    } catch (err) {
      console.error('Delete note error:', err);
      await vk.showNotification('❌', 'Не удалось удалить заметку', 'error');
      await loadNotes();
    }
  };

  // 🔥 Загрузка фото
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 🔥 Создание заметки с фото
  const handleCreateNote = async () => {
    if (!newNote.trim() && !selectedPhoto) return;

    try {
      setCreating(true);
      const result = await api.createPost({
        text: newNote,
        description: newNoteDescription,
        images: selectedPhoto ? [selectedPhoto] : [],
        trip_id: tripId
      });

      // Optimistic update - добавляем заметку сразу в список
      if (result.post) {
        setNotes(prev => [result.post, ...prev]);
      }

      setNewNote('');
      setNewNoteDescription('');
      setSelectedPhoto(null);
      setShowModal(false);
      await vk.showNotification('✅', 'Заметка добавлена', 'success');
    } catch (err) {
      console.error('Create note error:', err);
      await vk.showNotification('❌', 'Не удалось создать заметку', 'error');
      // Если ошибка, перезагружаем список
      await loadNotes();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Panel id="trip-notes">
        <PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>
          Загрузка...
        </PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel id="trip-notes">
      <PanelHeader 
        left={<Button mode="secondary" onClick={onBack} size="s" className="vh-btn">← Назад</Button>}
        aside={<Button mode="secondary" size="s" onClick={() => setShowEditModal(true)} className="vh-btn">✏️</Button>}
      >
        {tripName || 'Путешествие'}
      </PanelHeader>
      {tripDescription && (
        <Banner
          before={<Avatar size={24} style={{ background: 'var(--vkui--color_background_accent_tint)' }}>📝</Avatar>}
          header="Описание"
          subheader={tripDescription}
          style={{
            margin: '8px 16px',
            padding: '12px 16px',
            background: 'var(--vkui--color_background_content)',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
          }}
        />
      )}

      <div style={{ padding: 10, paddingBottom: 80 }}>
        {/* 🔥 Список заметок */}
        {notes.length === 0 ? (
          <Placeholder
            header="Пока нет заметок"
          >
            Добавьте первую заметку об этом путешествии
          </Placeholder>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(note => (
              <div
                key={note.id}
                className="vh-note-card"
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  minHeight: 150
                }}
                onClick={() => onOpenNoteEdit?.(note.id)}
              >
                {/* Фон (если есть фото) */}
                {note.images && note.images !== '[]' && (() => {
                  try {
                    const urls = typeof note.images === 'string' ? JSON.parse(note.images) : note.images;
                    if (Array.isArray(urls) && urls.length > 0) {
                      return (
                        <img
                          src={urls[0]}
                          alt={note.text}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            objectFit: 'cover', zIndex: 0
                          }}
                        />
                      );
                    }
                  } catch { return null; }
                })()}

                {/* Градиент если нет фото */}
                {(!note.images || note.images === '[]') && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: 0
                  }} />
                )}

                {/* Затемнение */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  background: 'rgba(0,0,0,0.4)', zIndex: 1
                }} />

                {/* Контент */}
                <div style={{
                  position: 'relative', zIndex: 2, padding: 15, color: 'white',
                  minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        {note.text ? note.text.substring(0, 50) + (note.text.length > 50 ? '...' : '') : 'Без текста'}
                      </div>
                      <Button
                        mode="tertiary"
                        size="s"
                        before={<Icon24DeleteOutline />}
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        style={{ marginLeft: 8, color: 'white' }}
                      />
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {note.description || (note.created_at && !isNaN(new Date(note.created_at)) ? new Date(note.created_at).toLocaleDateString('ru-RU') : 'Без описания')}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB Button */}
      <Button
        mode="primary"
        before={<Icon24Add />}
        onClick={() => {
          setNewNote('');
          setNewNoteDescription('');
          setSelectedPhoto(null);
          setCreating(false);
          setShowModal(true);
        }}
        className="vh-btn vh-fab"
      />

      {/* Modal */}
      {showModal && (
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
          onClick={() => !creating && setShowModal(false)}
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
              <h2 className="vh-modal__title" style={{ margin: 0 }}>Новая заметка</h2>
              <Button mode="secondary" size="s" disabled={creating} onClick={() => setShowModal(false)} className="vh-btn vh-modal__close-btn" before={<Icon24Cancel />} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Textarea
                className="vh-modal__textarea"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Расскажите о своём путешествии..."
                rows={4}
                disabled={creating}
              />

              <Textarea
                className="vh-modal__textarea"
                value={newNoteDescription}
                onChange={e => setNewNoteDescription(e.target.value)}
                placeholder="Краткое описание (будет показано вместо даты)"
                rows={2}
                disabled={creating}
              />

              {/* Превью фото */}
              {selectedPhoto && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img
                    src={selectedPhoto}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <Button
                    mode="secondary"
                    size="s"
                    onClick={() => setSelectedPhoto(null)}
                    className="vh-btn"
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)' }}
                    before={<Icon24Cancel />}
                  />
                </div>
              )}

              {/* Кнопка загрузки фото */}
              {!selectedPhoto && (
                <div
                  onClick={() => !creating && document.getElementById('trip-photo-upload')?.click()}
                  style={{
                    width: '100%',
                    height: 120,
                    borderRadius: 12,
                    border: '2px dashed #E8E4DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: creating ? 'default' : 'pointer',
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
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} id="trip-photo-upload" />

              <Button
                mode="primary"
                onClick={handleCreateNote}
                disabled={creating || (!newNote.trim() && !selectedPhoto)}
                loading={creating}
                stretched
                size="l"
                className="vh-btn"
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования путешествия */}
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
          onClick={() => !updating && setShowEditModal(false)}
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
              <h2 className="vh-modal__title" style={{ margin: 0 }}>Редактировать путешествие</h2>
              <Button mode="secondary" size="s" disabled={updating} onClick={() => setShowEditModal(false)} className="vh-btn vh-modal__close-btn" before={<Icon24Cancel />} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                className="vh-modal__input"
                value={editTripName}
                onChange={e => setEditTripName(e.target.value)}
                placeholder="Название города"
                disabled={updating}
              />

              <Input
                className="vh-modal__input"
                value={editTripDescription}
                onChange={e => setEditTripDescription(e.target.value)}
                placeholder="Описание путешествия"
                disabled={updating}
                multiline
                rows={3}
              />

              <Button
                mode="primary"
                onClick={handleUpdateTrip}
                disabled={updating || !editTripName.trim()}
                loading={updating}
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
    </Panel>
  );
}

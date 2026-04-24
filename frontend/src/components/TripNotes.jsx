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
  Card
} from '@vkontakte/vkui';
import { Icon24Add, Icon24Camera } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function TripNotes({ tripId, onBack, user, onOpenPost }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [creating, setCreating] = useState(false);
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    loadNotes();
  }, [tripId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getTripNotes(tripId);
      setNotes(data.notes || data.posts || []);
      
      // Получаем название путешествия
      const tripsData = await api.getUserTrips();
      const trip = tripsData.trips?.find(t => t.id === tripId);
      if (trip) setTripName(trip.name);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
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
        images: selectedPhoto ? [selectedPhoto] : [],
        trip_id: tripId // ← Привязываем к путешествию
      });

      // Optimistic update - добавляем заметку сразу в список
      if (result.post) {
        setNotes(prev => [result.post, ...prev]);
      }

      setNewNote('');
      setSelectedPhoto(null);
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
      <PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>
        {tripName || 'Путешествие'}
      </PanelHeader>
      
      <div style={{ padding: 10, paddingBottom: 100 }}>
        {/* 🔥 Форма создания заметки (как в ленте) */}
        <Card style={{ padding: 15, marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8 }}>Новая заметка</Text>
          
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Расскажите о своём путешествии..."
            rows={3}
            style={{ marginBottom: 12 }}
          />
          
          {/* 🔥 Превью фото */}
          {selectedPhoto && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img 
                src={selectedPhoto} 
                alt="Preview" 
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }}
              />
              <Button
                mode="secondary"
                size="s"
                onClick={() => setSelectedPhoto(null)}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)' }}
              >
                ✕
              </Button>
            </div>
          )}
          
          {/* 🔥 Кнопка загрузки фото */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              id="trip-photo-upload"
            />
            <Button
              mode="secondary"
              size="s"
              onClick={() => document.getElementById('trip-photo-upload')?.click()}
              before={<Icon24Camera />}
            >
              Добавить фото
            </Button>
          </div>
          
          <Button
            mode="primary"
            onClick={handleCreateNote}
            disabled={creating || (!newNote.trim() && !selectedPhoto)}
            stretched
          >
            {creating ? <Spinner size="small" /> : 'Добавить'}
          </Button>
        </Card>

        {/* 🔥 Список заметок */}
        {notes.length === 0 ? (
          <Placeholder
            header="Пока нет заметок"
            action={<Button mode="primary" onClick={() => document.getElementById('trip-photo-upload')?.click()}>Добавить первую заметку</Button>}
          >
            Добавьте первую заметку об этом путешествии
          </Placeholder>
        ) : (
          notes.map(note => (
            <Card
              key={note.id}
              className="vh-note-card"
              onClick={() => onOpenPost?.(note.id)}
              style={{
                padding: 15,
                marginBottom: 12,
                cursor: 'pointer'
              }}
            >
              {/* Шапка заметки */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Avatar src={note.avatar} size={40} />
                <div>
                  <Text weight="2">{note.first_name} {note.last_name}</Text>
                  <Text caption style={{ color: 'var(--vkui--color_text_subhead)' }}>
                    {new Date(note.created_at).toLocaleDateString('ru-RU')}
                  </Text>
                </div>
              </div>

              {/* Текст */}
              {note.text && (
                <Text style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                  {note.text}
                </Text>
              )}

              {/* 🔥 Фото */}
              {note.images && note.images !== '[]' && (
                <div style={{ marginTop: 10 }}>
                  {(() => {
                    try {
                      const urls = typeof note.images === 'string' 
                        ? JSON.parse(note.images) 
                        : note.images;
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

              {/* Лайки (если есть) */}
              {note.likes_count !== undefined && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>❤️</span>
                  <Text caption>{note.likes_count}</Text>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </Panel>
  );
}

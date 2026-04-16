import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Button,
  Spinner,
  Placeholder,
  Avatar,
  Text,
  Textarea
} from '@vkontakte/vkui';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function TripNotes({ tripId, onBack, user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [tripId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getTripNotes(tripId);
      setNotes(data.notes || data.posts || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setCreating(true);
      await api.createPost({
        text: newNote,
        trip_id: tripId // ← Привязываем к путешествию
      });
      
      setNewNote('');
      await loadNotes();
      await vk.showNotification('✅', 'Заметка добавлена', 'success');
    } catch (err) {
      console.error('Create note error:', err);
      await vk.showNotification('❌', 'Не удалось создать заметку', 'error');
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
        Заметки
      </PanelHeader>
      
      <div style={{ padding: 10, paddingBottom: 100 }}>
        {/* Форма создания заметки */}
        <div style={{ marginBottom: 20, padding: 15, background: 'var(--vkui--color_background_content)', borderRadius: 12 }}>
          <Text weight="2" style={{ marginBottom: 8 }}>Новая заметка</Text>
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Расскажите о своём путешествии..."
            rows={3}
            style={{ marginBottom: 10 }}
          />
          <Button
            mode="primary"
            onClick={handleCreateNote}
            disabled={creating || !newNote.trim()}
            stretched
          >
            {creating ? <Spinner size="small" /> : 'Добавить'}
          </Button>
        </div>

        {/* Список заметок */}
        {notes.length === 0 ? (
          <Placeholder header="Пока нет заметок">
            Добавьте первую заметку об этом путешествии
          </Placeholder>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              style={{
                background: 'var(--vkui--color_background_content)',
                borderRadius: 12,
                padding: 15,
                marginBottom: 12
              }}
            >
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Avatar src={note.avatar} size={40} />
                <div>
                  <Text weight="2">{note.first_name} {note.last_name}</Text>
                  <Text caption style={{ color: 'var(--vkui--color_text_subhead)' }}>
                    {new Date(note.created_at).toLocaleDateString('ru-RU')}
                  </Text>
                </div>
              </div>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{note.text}</Text>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

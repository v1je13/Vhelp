// src/components/Trips.jsx
import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Button,
  Spinner,
  Placeholder,
  Alert
} from '@vkontakte/vkui';
import { Icon24Add, Icon20User, Icon20DeleteOutline } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Trips({ user, onOpenTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDescription, setNewTripDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await api.getUserTrips();
      setTrips(data.trips || []);
    } catch (err) {
      console.error('Failed to load trips:', err);
      await vk.showNotification('❌', 'Не удалось загрузить путешествия', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) return;
    
    try {
      setCreating(true);
      await api.createTrip({
        name: newTripName.trim(),
        description: newTripDescription.trim()
      });
      
      setNewTripName('');
      setNewTripDescription('');
      setShowCreateModal(false);
      
      await loadTrips();
      await vk.showNotification('✅', 'Путешествие создано', 'success');
    } catch (err) {
      console.error('Create trip error:', err);
      await vk.showNotification('❌', 'Не удалось создать путешествие', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = async (tripId, e) => {
    e.stopPropagation();
    
    const confirmed = await new Promise((resolve) => {
      Alert.show(
        'Удалить путешествие?',
        'Все заметки будут удалены',
        [
          { title: 'Отмена', action: () => resolve(false) },
          { title: 'Удалить', action: () => resolve(true), mode: 'destructive' }
        ]
      );
    });
    
    if (!confirmed) return;
    
    try {
      await api.deleteTrip(tripId);
      await loadTrips();
      await vk.showNotification('✅', 'Путешествие удалено', 'success');
    } catch (err) {
      console.error('Delete trip error:', err);
      await vk.showNotification('❌', 'Не удалось удалить путешествие', 'error');
    }
  };

  if (loading) {
    return (
      <Panel id="trips" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader>Дневник</PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel id="trips" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PanelHeader 
        right={
          <Button 
            mode="primary" 
            size="s"
            before={<Icon24Add />}
            onClick={() => setShowCreateModal(true)}
          >
            Создать
          </Button>
        }
      >
        Дневник
      </PanelHeader>

      <div style={{ padding: 10, minHeight: '100vh', paddingBottom: 80 }}>
        {trips.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 20
          }}>
            <Placeholder
              header="Пока нет путешествий"
              action={
                <Button 
                  mode="primary" 
                  size="m"
                  onClick={() => setShowCreateModal(true)}
                  style={{ marginTop: 15 }}
                >
                  Создать первое путешествие
                </Button>
              }
            >
              Создайте путешествие, чтобы начать вести дневник
            </Placeholder>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trips.map(trip => (
              <div
                key={trip.id}
                onClick={() => onOpenTrip?.(trip.id)}
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  minHeight: 150
                }}
              >
                {/* Фоновое изображение (если есть) */}
                {trip.cover_image ? (
                  <img
                    src={trip.cover_image}
                    alt={trip.name}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 0
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    zIndex: 0
                  }} />
                )}
                
                {/* Затемнение фона */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  zIndex: 1
                }} />
                
                {/* Контент */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: 15,
                  color: 'white',
                  minHeight: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Заголовок */}
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                      {trip.name}
                    </div>
                    {trip.description && (
                      <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                        {trip.description}
                      </div>
                    )}
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {trip.notes_count || 0} {trip.notes_count === 1 ? 'заметка' : trip.notes_count < 5 ? 'заметки' : 'заметок'}
                    </div>
                  </div>
                  
                  {/* Кнопки */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button
                      mode="secondary"
                      size="s"
                      before={<Icon20User />}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Поделиться с другом
                      }}
                      style={{ background: 'rgba(255,255,255,0.9)' }}
                    />
                    <Button
                      mode="secondary"
                      size="s"
                      before={<Icon20DeleteOutline />}
                      onClick={(e) => handleDeleteTrip(trip.id, e)}
                      style={{ background: 'rgba(255,255,255,0.9)' }}
                    />
                    <Button
                      mode="primary"
                      size="s"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTrip?.(trip.id);
                      }}
                    >
                      Далее
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 Исправленное модальное окно */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--vkui--color_background)',
              borderRadius: '16px 16px 0 0',
              padding: 20,
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Заголовок модального окна */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 15,
              borderBottom: '1px solid var(--vkui--color_separator_primary)'
            }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                Новое путешествие
              </h2>
              <Button
                mode="secondary"
                size="s"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </Button>
            </div>

            {/* Форма */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ 
                  fontSize: 13, 
                  color: 'var(--vkui--color_text_subhead)',
                  marginBottom: 8 
                }}>
                  Название *
                </div>
                <input
                  type="text"
                  value={newTripName}
                  onChange={e => setNewTripName(e.target.value)}
                  placeholder="Например: Поездка в Сочи"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--vkui--color_border_primary)',
                    backgroundColor: 'var(--vkui--color_background_content)',
                    color: 'var(--vkui--color_text_primary)',
                    fontSize: 15,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ 
                  fontSize: 13, 
                  color: 'var(--vkui--color_text_subhead)',
                  marginBottom: 8 
                }}>
                  Описание
                </div>
                <textarea
                  value={newTripDescription}
                  onChange={e => setNewTripDescription(e.target.value)}
                  placeholder="Расскажите о вашем путешествии..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--vkui--color_border_primary)',
                    backgroundColor: 'var(--vkui--color_background_content)',
                    color: 'var(--vkui--color_text_primary)',
                    fontSize: 15,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Кнопки */}
              <div style={{ 
                display: 'flex', 
                gap: 10, 
                marginTop: 10,
                paddingTop: 15,
                borderTop: '1px solid var(--vkui--color_separator_primary)'
              }}>
                <Button
                  mode="secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  Отмена
                </Button>
                <Button
                  mode="primary"
                  onClick={handleCreateTrip}
                  disabled={creating || !newTripName.trim()}
                  style={{ flex: 2 }}
                >
                  {creating ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

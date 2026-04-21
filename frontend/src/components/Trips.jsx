// src/components/Trips.jsx
import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Button,
  Spinner,
  Placeholder,
  Alert,
  Input,
  Avatar
} from '@vkontakte/vkui';
import { Icon24DeleteOutline, Icon24Add, Icon24Camera } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Trips({ user, onOpenTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для формы создания
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [selectedCover, setSelectedCover] = useState(null); // Для превью фото
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
      // await vk.showNotification('❌', 'Ошибка загрузки', 'error'); // Можно включить если нужно
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Обработка загрузки фото
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedCover(reader.result); // Сохраняем base64 для превью и отправки
    };
    reader.readAsDataURL(file);
  };

  // 🔥 Создание путешествия
  const handleCreateTrip = async () => {
    if (!newTripName.trim()) return;
    
    try {
      setCreating(true);
      const response = await api.createTrip({
        name: newTripName.trim(),
        cover_image: selectedCover || null // Отправляем фото (или null)
      });
      
      console.log('Trip created:', response);
      
      // Сброс формы
      setNewTripName('');
      setSelectedCover(null);
      setShowCreateModal(false);
      
      await loadTrips();
      await vk.showNotification('✅', 'Путешествие создано', 'success');
    } catch (err) {
      console.error('Create trip error:', err);
      const errorMsg = err.message || 'Не удалось создать';
      await vk.showNotification('❌', errorMsg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = async (tripId, e) => {
    e.stopPropagation();
    
    const confirmed = await new Promise((resolve) => {
      Alert.show('Удалить путешествие?', 'Все заметки будут удалены', [
        { title: 'Отмена', action: () => resolve(false) },
        { title: 'Удалить', action: () => resolve(true), mode: 'destructive' }
      ]);
    });
    
    if (!confirmed) return;
    
    try {
      await api.deleteTrip(tripId);
      await loadTrips();
      await vk.showNotification('✅', 'Удалено', 'success');
    } catch (err) {
      console.error('Delete trip error:', err);
      await vk.showNotification('❌', 'Ошибка удаления', 'error');
    }
  };

  if (loading) {
    return (
      <Panel id="trips">
        <PanelHeader>Дневник</PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel id="trips">
      <PanelHeader 
        right={<Button mode="primary" size="s" before={<Icon24Add />} onClick={() => setShowCreateModal(true)}>Создать</Button>}
      >Дневник</PanelHeader>

      <div style={{ padding: 10, minHeight: '100vh', paddingBottom: 80 }}>
        {trips.length === 0 ? (
          <Placeholder header="Пока нет путешествий" action={<Button mode="primary" onClick={() => setShowCreateModal(true)}>Создать первое путешествие</Button>}>Создайте путешествие, чтобы начать вести дневник</Placeholder>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trips.map(trip => (
              <div key={trip.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minHeight: 150 }}>
                {/* Фон (если есть) */}
                {trip.cover_image ? (
                  <img
                    src={trip.cover_image}
                    alt={trip.name}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      objectFit: 'cover', zIndex: 0
                    }}
                  />
                ) : (
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
                    <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{trip.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{trip.notes_count || 0} заметок</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button mode="secondary" size="s" before={<Icon24DeleteOutline />} onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id, e); }} style={{ background: 'rgba(255,255,255,0.9)' }} />
                    <Button mode="primary" size="s" onClick={(e) => { e.stopPropagation(); onOpenTrip?.(trip.id); }}>Далее</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 МОДАЛЬНОЕ ОКНО (Центрированное, с фото) */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div 
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
            {/* Заголовок */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Новое путешествие</h2>
              <Button mode="secondary" size="s" disabled={creating} onClick={() => setShowCreateModal(false)}>✕</Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text weight="2" style={{ marginBottom: 8, display: 'block' }}>Название</Text>
                <Input 
                  value={newTripName}
                  onChange={e => setNewTripName(e.target.value)}
                  placeholder="Например: Лето в Париже"
                  disabled={creating}
                />
              </div>

              <div>
                <Text weight="2" style={{ marginBottom: 8, display: 'block' }}>Обложка</Text>
                <div 
                  onClick={() => !creating && document.getElementById('trip-photo')?.click()}
                  style={{
                    width: '100%',
                    height: 150,
                    borderRadius: 12,
                    border: '2px dashed var(--vkui--color_separator_primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: creating ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {selectedCover ? (
                    <img src={selectedCover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                      <Icon24Camera style={{ margin: '0 auto 8px' }} />
                      <Text>Добавить фото</Text>
                    </div>
                  )}
                </div>
                <input type="file" id="trip-photo" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>

              <Button 
                size="l" 
                stretched 
                loading={creating}
                disabled={!newTripName.trim()}
                onClick={handleCreateTrip}
              >
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

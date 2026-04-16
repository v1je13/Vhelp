// src/components/Trips.jsx
import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Button,
  Spinner,
  Placeholder,
  Alert,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Input,
  Textarea
} from '@vkontakte/vkui';
import { Icon29Add, Icon29User, Icon29DeleteOutline } from '@vkontakte/icons';
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
        right={
          <Button 
            mode="primary" 
            size="s"
            before={<Icon29Add />}
            onClick={() => setShowCreateModal(true)}
          >
            Создать
          </Button>
        }
      >
        Дневник
      </PanelHeader>

      <div style={{ padding: 10 }}>
        {trips.length === 0 ? (
          <Placeholder
            header="Пока нет путешествий"
            action={
              <Button mode="primary" onClick={() => setShowCreateModal(true)}>
                Создать первое путешествие
              </Button>
            }
          >
            Создайте путешествие, чтобы начать вести дневник
          </Placeholder>
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
                      before={<Icon29User />}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Поделиться с другом
                      }}
                      style={{ background: 'rgba(255,255,255,0.9)' }}
                    />
                    <Button
                      mode="secondary"
                      size="s"
                      before={<Icon29DeleteOutline />}
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

      {/* Модальное окно создания путешествия */}
      <ModalRoot activeModal={showCreateModal ? 'create' : 'none'}>
        <ModalPage
          id="create"
          header={
            <ModalPageHeader>
              <Button mode="secondary" size="s" onClick={() => setShowCreateModal(false)}>
                Отмена
              </Button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
                Новое путешествие
              </div>
              <Button 
                mode="primary" 
                size="s" 
                onClick={handleCreateTrip}
                disabled={creating || !newTripName.trim()}
              >
                Создать
              </Button>
            </ModalPageHeader>
          }
          onClose={() => setShowCreateModal(false)}
        >
          <div style={{ padding: 20 }}>
            <FormItem top="Название *">
              <Input
                value={newTripName}
                onChange={e => setNewTripName(e.target.value)}
                placeholder="Например: Поездка в Сочи"
              />
            </FormItem>
            
            <FormItem top="Описание">
              <Textarea
                value={newTripDescription}
                onChange={e => setNewTripDescription(e.target.value)}
                placeholder="Расскажите о вашем путешествии..."
                rows={3}
              />
            </FormItem>
          </div>
        </ModalPage>
      </ModalRoot>
    </Panel>
  );
}

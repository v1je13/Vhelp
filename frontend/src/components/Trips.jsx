// src/components/Trips.jsx
import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Button,
  Spinner,
  Placeholder,
  Avatar
} from '@vkontakte/vkui';
import { Icon24DeleteOutline } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Trips({ user, onOpenTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeleteTrip = async (tripId, e) => {
    e.stopPropagation();

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
    <>
      <Panel id="trips">
        <PanelHeader>Дневник</PanelHeader>

        <div style={{ padding: 10, minHeight: '100vh', paddingBottom: 80 }}>
          {trips.length === 0 ? (
            <Placeholder header="Пока нет путешествий">Создайте путешествие, чтобы начать вести дневник</Placeholder>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {trips.map(trip => (
                <div key={trip.id} className="vh-trip-card" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minHeight: 150 }}>
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
      </Panel>
    </>
  );
}

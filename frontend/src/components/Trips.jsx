// src/components/Trips.jsx
import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Button,
  Spinner,
  Placeholder,
  Avatar,
  Input
} from '@vkontakte/vkui';
import { Icon24DeleteOutline, Icon24Add, Icon24Camera } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Trips({ user, onOpenTrip, onTripCreated, newTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tripName, setTripName] = useState('');
  const [selectedCover, setSelectedCover] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [onTripCreated]);

  // Optimistic update - add new trip immediately
  useEffect(() => {
    if (newTrip) {
      setTrips(prev => [newTrip, ...prev]);
    }
  }, [newTrip]);

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

  const handleCreateTrip = async () => {
    if (!tripName.trim()) return;

    try {
      setCreating(true);
      await api.createTrip({
        name: tripName.trim(),
        cover_image: selectedCover,
      });

      setTripName('');
      setSelectedCover(null);
      setShowModal(false);
      onTripCreated?.();

      await vk.showNotification('✅', 'Путешествие создано', 'success');
    } catch (err) {
      console.error('Create trip error:', err);
      await vk.showNotification('❌', 'Не удалось создать путешествие', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setSelectedCover(reader.result);
    reader.readAsDataURL(file);
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
                <div
                  key={trip.id}
                  className="vh-trip-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #E8E4DB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                  onClick={() => onOpenTrip?.(trip.id)}
                >
                  {/* Header with cover image or gradient */}
                  <div style={{
                    position: 'relative',
                    height: 120,
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 8
                  }}>
                    {trip.cover_image ? (
                      <img
                        src={trip.cover_image}
                        alt={trip.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#000000', marginBottom: 4 }}>{trip.name}</div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>{trip.notes_count || 0} заметок</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        mode="secondary"
                        size="s"
                        before={<Icon24DeleteOutline />}
                        onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.id, e); }}
                        className="vh-btn"
                      />
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
            setTripName('');
            setSelectedCover(null);
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
                <h2 className="vh-modal__title" style={{ margin: 0 }}>Новое путешествие</h2>
                <Button mode="secondary" size="s" disabled={creating} onClick={() => setShowModal(false)} className="vh-btn vh-modal__close-btn">✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  className="vh-modal__input"
                  value={tripName}
                  onChange={e => setTripName(e.target.value)}
                  placeholder="Название путешествия"
                  disabled={creating}
                />

                <div
                  onClick={() => !creating && document.getElementById('trips-cover-upload')?.click()}
                  style={{
                    width: '100%',
                    height: 150,
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
                  {selectedCover ? (
                    <img src={selectedCover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#6B7280' }}>
                      <Icon24Camera style={{ margin: '0 auto 8px' }} />
                      <div>Добавить обложку</div>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} id="trips-cover-upload" />

                <Button
                  mode="primary"
                  onClick={handleCreateTrip}
                  disabled={creating || !tripName.trim()}
                  loading={creating}
                  stretched
                  size="l"
                  className="vh-btn"
                >
                  Создать
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

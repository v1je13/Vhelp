import React from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Title,
  Text,
  Button,
  SimpleCell,
  Header,
} from "@vkontakte/vkui";

export default function TravelDetail({ nav, travel, onBack }) {
  const formatDate = (dateString) => {
    if (!dateString) return "Дата не указана";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!travel) {
    return (
      <Panel nav={nav}>
        <PanelHeader>Путешествие не найдено</PanelHeader>
        <Group>
          <Div>
            <Button onClick={onBack}>Вернуться в профиль</Button>
          </Div>
        </Group>
      </Panel>
    );
  }

  const daysCount = calculateDays(travel.startDate, travel.endDate);

  return (
    <Panel nav={nav}>
      <PanelHeader 
        before={
          <Button mode="tertiary" onClick={onBack}>
            ← Назад
          </Button>
        }
      >
        {travel.hotelName}
      </PanelHeader>

      <Group>
        <Div>
          {travel.image && (
            <img 
              src={travel.image} 
              alt={travel.hotelName}
              style={{ 
                width: "100%", 
                height: 200, 
                objectFit: "cover", 
                borderRadius: 12,
                marginBottom: 16
              }}
            />
          )}
          
          <Title level="1" style={{ marginBottom: 8 }}>
            {travel.hotelName}
          </Title>
          
          <SimpleCell>
            📍 {travel.city}, {travel.country}
          </SimpleCell>
          
          {travel.startDate && travel.endDate && (
            <SimpleCell>
              📅 {formatDate(travel.startDate)} — {formatDate(travel.endDate)}
              <Text style={{ fontSize: 13, color: "var(--vkui--color_text_secondary)" }}>
                ({daysCount} {getDaysWord(daysCount)})
              </Text>
            </SimpleCell>
          )}
          
          <SimpleCell>
            ⭐ Рейтинг: {travel.rating || 4.5} / 5
          </SimpleCell>
        </Div>

        <Header mode="secondary">Описание</Header>
        <Div>
          <Text style={{ lineHeight: 1.5 }}>
            {travel.description || "Отличное место для отдыха!"}
          </Text>
        </Div>

        <Header mode="secondary">Мои впечатления</Header>
        <Div>
          <Text style={{ lineHeight: 1.5, marginBottom: 16 }}>
            {travel.review || "Путешествие прошло отлично!"}
          </Text>
          
          <div style={{ display: "flex", gap: 8 }}>
            <Button 
              size="m" 
              mode="primary"
              onClick={() => console.log("Редактировать отзыв", travel.id)}
            >
              ✏️ Написать отзыв
            </Button>
            <Button 
              size="m" 
              mode="tertiary"
              onClick={() => console.log("Поделиться", travel.id)}
            >
              📤 Поделиться
            </Button>
          </div>
        </Div>
      </Group>
    </Panel>
  );
}

function getDaysWord(days) {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "дней";
  }
  
  switch (lastDigit) {
    case 1:
      return "день";
    case 2:
    case 3:
    case 4:
      return "дня";
    default:
      return "дней";
  }
}
import React, { useState } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Div,
  Input,
  Textarea,
  Button,
  FormItem,
  FormLayout,
  DatePicker,
  Select,
  Snackbar,
} from "@vkontakte/vkui";


export default function AddTravel({ nav, onBack, onSave }) {
  const [formData, setFormData] = useState({
    hotelName: "",
    city: "",
    country: "",
    startDate: new Date(),
    endDate: new Date(),
    rating: "4",
    description: "",
  });
  const [snackbar, setSnackbar] = useState(null);

  const handleSave = () => {
    // Здесь логика сохранения
    onSave(formData);
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon28CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
      >
        Путешествие добавлено!
      </Snackbar>
    );
    setTimeout(() => onBack(), 1500);
  };

  return (
    <Panel nav={nav}>
      <PanelHeader before={<Button mode="tertiary" onClick={onBack}>Отмена</Button>}>
        Новое путешествие
      </PanelHeader>

      <FormLayout>
        <FormItem top="Название отеля" required>
          <Input
            value={formData.hotelName}
            onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
            placeholder="Например: Grand Hotel"
          />
        </FormItem>

        <FormItem top="Город">
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Город"
          />
        </FormItem>

        <FormItem top="Страна">
          <Input
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="Страна"
          />
        </FormItem>

        <FormItem top="Даты поездки">
          <div style={{ display: "flex", gap: 8 }}>
            <DatePicker
              min={{ day: 1, month: 1, year: 2020 }}
              max={{ day: 31, month: 12, year: 2030 }}
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
            />
            <span style={{ alignSelf: "center" }}>—</span>
            <DatePicker
              min={{ day: 1, month: 1, year: 2020 }}
              max={{ day: 31, month: 12, year: 2030 }}
              value={formData.endDate}
              onChange={(value) => setFormData({ ...formData, endDate: value })}
            />
          </div>
        </FormItem>

        <FormItem top="Рейтинг">
          <Select
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            options={[
              { label: "⭐ 5", value: "5" },
              { label: "⭐ 4", value: "4" },
              { label: "⭐ 3", value: "3" },
              { label: "⭐ 2", value: "2" },
              { label: "⭐ 1", value: "1" },
            ]}
          />
        </FormItem>

        <FormItem top="Описание">
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Поделитесь впечатлениями..."
            rows={4}
          />
        </FormItem>

        <FormItem>
          <Button size="l" stretched onClick={handleSave}>
            Сохранить
          </Button>
        </FormItem>
      </FormLayout>

      {snackbar}
    </Panel>
  );
}
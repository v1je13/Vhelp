import React from "react";
import { Card, Text, Title, Avatar, Button, Div } from "@vkontakte/vkui";

export default function PostCard({ post, onLike, onComment, onShare }) {
  if (!post) return null;

  const getCategoryIcon = () => {
    switch (post.category) {
      case "hotels":
        return "🏨";
      case "mountains":
        return "🏔️";
      case "beaches":
        return "🏖️";
      default:
        return "✈️";
    }
  };

  const getCategoryLabel = () => {
    switch (post.category) {
      case "hotels":
        return "Отель";
      case "mountains":
        return "Горы";
      case "beaches":
        return "Пляж";
      default:
        return "Путешествие";
    }
  };

  const handleCardClick = (e) => {
    // Предотвращаем всплытие клика, если кликнули по кнопкам
    if (e.target.closest('button')) {
      e.stopPropagation();
    }
  };

  return (
    <div onClick={handleCardClick}>
      <Card mode="shadow" style={{ marginBottom: 12 }}>
        <div style={{ padding: 16 }}>
          {/* Автор и категория */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <Avatar size={40} src={post.avatar || "https://vk.com/images/camera_100.png"} />
            <div style={{ marginLeft: 12, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Title level="3" style={{ fontSize: 16 }}>
                  {post.author || "Пользователь"}
                </Title>
                <div style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 4,
                  padding: "2px 8px",
                  background: "var(--vkui--color_background_secondary)",
                  borderRadius: 12,
                  fontSize: 12
                }}>
                  <span>{getCategoryIcon()}</span>
                  <span style={{ fontSize: 12 }}>{getCategoryLabel()}</span>
                </div>
              </div>
              <Text style={{ fontSize: 12, color: "var(--vkui--color_text_secondary)", marginTop: 2 }}>
                {post.date || "только что"}
              </Text>
            </div>
          </div>
          
          {/* Текст поста */}
          <Text style={{ marginBottom: 12, lineHeight: 1.4 }}>
            {post.text || ""}
          </Text>
          
          {/* Отображение отеля для категории "hotels" */}
          {post.hotel && (
            <Card mode="outline" style={{ marginBottom: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                    🏨 {post.hotel.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: "var(--vkui--color_text_secondary)" }}>
                    📍 {post.hotel.city}
                  </Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <span>⭐</span>
                    <Text style={{ fontWeight: "bold" }}>{post.hotel.rating}</Text>
                  </div>
                  <Text style={{ fontSize: 13, color: "var(--vkui--color_text_accent)", fontWeight: "bold" }}>
                    {post.hotel.price}
                  </Text>
                </div>
              </div>
            </Card>
          )}
          
          {/* Отображение локации для категорий "mountains" и "beaches" */}
          {post.location && (
            <Card mode="outline" style={{ marginBottom: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                    📍 {post.location}
                  </Text>
                  {post.difficulty && (
                    <Text style={{ fontSize: 13, color: "var(--vkui--color_text_secondary)" }}>
                      {post.difficulty === "легкий" && "🟢 Легкий"}
                      {post.difficulty === "средний" && "🟡 Средний"}
                      {post.difficulty === "сложный" && "🔴 Сложный"}
                    </Text>
                  )}
                </div>
                {post.duration && (
                  <Text style={{ fontSize: 13, color: "var(--vkui--color_text_secondary)" }}>
                    ⏱️ {post.duration}
                  </Text>
                )}
              </div>
            </Card>
          )}
          
          {/* Изображения (если есть) */}
          {post.images && post.images.length > 0 && (
            <div style={{ 
              display: "flex", 
              gap: 8, 
              marginBottom: 12, 
              overflowX: "auto",
              paddingBottom: 4
            }}>
              {post.images.slice(0, 2).map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`Фото ${idx + 1}`}
                  style={{ 
                    width: "calc(50% - 4px)", 
                    height: 120, 
                    objectFit: "cover", 
                    borderRadius: 8,
                    cursor: "pointer"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Открыть фото", idx);
                  }}
                />
              ))}
              {post.images.length > 2 && (
                <div style={{ 
                  width: "calc(50% - 4px)", 
                  height: 120, 
                  background: "var(--vkui--color_background_secondary)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Открыть все фото");
                }}>
                  <Text style={{ textAlign: "center" }}>
                    +{post.images.length - 2} фото
                  </Text>
                </div>
              )}
            </div>
          )}
          
          {/* Кнопки действий */}
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <Button 
              mode="tertiary" 
              size="s" 
              onClick={(e) => {
                e.stopPropagation();
                if (onLike) onLike();
              }}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              ❤️ {post.likes || 0}
            </Button>
            <Button 
              mode="tertiary" 
              size="s" 
              onClick={(e) => {
                e.stopPropagation();
                if (onComment) onComment();
              }}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              💬 {post.comments || 0}
            </Button>
            <Button 
              mode="tertiary" 
              size="s" 
              onClick={(e) => {
                e.stopPropagation();
                if (onShare) onShare();
              }}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              🔄 {post.reposts || 0}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
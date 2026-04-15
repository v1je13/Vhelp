import React, { useState } from "react";
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
  Avatar,
  Card,
  Separator,
  Counter,
  Spacing,
  Footer,
  HorizontalScroll,
} from "@vkontakte/vkui";
import {
  Icon28LikeOutline,
  Icon28CommentOutline,
  Icon28ShareOutline,
  Icon28BookmarkOutline,
  Icon28MessageOutline,
} from "@vkontakte/icons";

export default function PostDetail({ nav, post, onBack, onLike, onComment, onShare }) {
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([
    {
      id: 1,
      author: "Анна Смирнова",
      avatar: "https://vk.com/images/camera_100.png",
      text: "Классное путешествие! Тоже хочу туда! 🔥",
      date: "2 часа назад",
      likes: 5,
    },
    {
      id: 2,
      author: "Михаил Волков",
      avatar: "https://vk.com/images/camera_100.png",
      text: "Отличные фото! А сколько дней вы там были?",
      date: "1 час назад",
      likes: 3,
    },
    {
      id: 3,
      author: "Елена Козлова",
      avatar: "https://vk.com/images/camera_100.png",
      text: "Шикарное место! Обязательно добавлю в свой список желаний! 💫",
      date: "30 минут назад",
      likes: 8,
    },
  ]);
  const [newComment, setNewComment] = useState("");

  if (!post) {
    return (
      <Panel nav={nav}>
        <PanelHeader>Пост не найден</PanelHeader>
        <Group>
          <Div>
            <Button onClick={onBack}>Вернуться в ленту</Button>
          </Div>
        </Group>
      </Panel>
    );
  }

  const handleLike = () => {
    setLiked(!liked);
    if (onLike) onLike(post.id);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const newCommentObj = {
        id: comments.length + 1,
        author: "Вы",
        avatar: "https://vk.com/images/camera_100.png",
        text: newComment,
        date: "только что",
        likes: 0,
      };
      setComments([newCommentObj, ...comments]);
      setNewComment("");
      if (onComment) onComment(post.id);
    }
  };

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

  const getCategoryTitle = () => {
    switch (post.category) {
      case "hotels":
        return "Отель";
      case "mountains":
        return "Горное путешествие";
      case "beaches":
        return "Пляжный отдых";
      default:
        return "Путешествие";
    }
  };

  return (
    <Panel nav={nav}>
      <PanelHeader 
        before={
          <Button mode="tertiary" onClick={onBack}>
            ← Назад
          </Button>
        }
      >
        {getCategoryIcon()} {post.hotel?.name || post.location || "Пост"}
      </PanelHeader>

      {/* Автор и основной контент */}
      <Group>
        <Div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <Avatar size={56} src={post.avatar || "https://vk.com/images/camera_100.png"} />
            <div style={{ marginLeft: 12 }}>
              <Title level="2" style={{ fontSize: 18 }}>
                {post.author || "Пользователь"}
              </Title>
              <Text style={{ fontSize: 13, color: "var(--vkui--color_text_secondary)" }}>
                {post.date || "только что"} • {getCategoryTitle()}
              </Text>
            </div>
          </div>

          <Title level="1" style={{ marginBottom: 12, fontSize: 20 }}>
            {post.hotel?.name || post.location || "Моё путешествие"}
          </Title>

          <Text style={{ lineHeight: 1.5, marginBottom: 16, fontSize: 16 }}>
            {post.text || ""}
          </Text>

          {/* Детальная информация в зависимости от категории */}
          {post.hotel && (
            <Card mode="outline" style={{ padding: 16, marginBottom: 16 }}>
              <Title level="3" style={{ marginBottom: 12 }}>
                📋 Информация об отеле
              </Title>
              <SimpleCell>
                🏨 Название: <strong>{post.hotel.name}</strong>
              </SimpleCell>
              <SimpleCell>
                📍 Город: <strong>{post.hotel.city}</strong>
              </SimpleCell>
              <SimpleCell>
                ⭐ Рейтинг: <strong>{post.hotel.rating} / 5</strong>
              </SimpleCell>
              <SimpleCell>
                💰 Цена: <strong>{post.hotel.price}</strong>
              </SimpleCell>
            </Card>
          )}

          {post.location && (
            <Card mode="outline" style={{ padding: 16, marginBottom: 16 }}>
              <Title level="3" style={{ marginBottom: 12 }}>
                📋 Информация о локации
              </Title>
              <SimpleCell>
                📍 Место: <strong>{post.location}</strong>
              </SimpleCell>
              {post.difficulty && (
                <SimpleCell>
                  🎯 Сложность: <strong>
                    {post.difficulty === "легкий" ? "🟢 Легкий" : 
                     post.difficulty === "средний" ? "🟡 Средний" : 
                     "🔴 Сложный"}
                  </strong>
                </SimpleCell>
              )}
              {post.duration && (
                <SimpleCell>
                  ⏱️ Длительность: <strong>{post.duration}</strong>
                </SimpleCell>
              )}
            </Card>
          )}

          {/* Галерея изображений */}
          {post.images && post.images.length > 0 && (
            <>
              <Header mode="secondary">Фотографии</Header>
              <HorizontalScroll>
                <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
                  {post.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`Фото ${idx + 1}`}
                      style={{ 
                        width: 200, 
                        height: 150, 
                        objectFit: "cover", 
                        borderRadius: 12,
                        cursor: "pointer"
                      }}
                      onClick={() => console.log("Открыть фото", idx)}
                    />
                  ))}
                </div>
              </HorizontalScroll>
            </>
          )}

          {/* Действия с постом */}
          <Separator style={{ margin: "16px 0" }} />
          
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
            <Button 
              mode={liked ? "primary" : "tertiary"} 
              size="l" 
              before={<Icon28LikeOutline />}
              onClick={handleLike}
            >
              {post.likes + (liked ? 1 : 0)}
            </Button>
            <Button 
              mode="tertiary" 
              size="l" 
              before={<Icon28CommentOutline />}
              onClick={() => document.getElementById("comment-input")?.focus()}
            >
              {post.comments || 0}
            </Button>
            <Button 
              mode="tertiary" 
              size="l" 
              before={<Icon28ShareOutline />}
              onClick={() => onShare && onShare(post.id)}
            >
              {post.reposts || 0}
            </Button>
            <Button 
              mode="tertiary" 
              size="l" 
              before={<Icon28BookmarkOutline />}
              onClick={() => console.log("Добавить в закладки")}
            >
              Сохранить
            </Button>
          </div>

          <Separator />
        </Div>
      </Group>

      {/* Комментарии */}
      <Group header={<Header mode="secondary">Комментарии ({comments.length})</Header>}>
        <Div>
          {/* Форма добавления комментария */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Avatar size={36} src="https://vk.com/images/camera_100.png" />
            <div style={{ flex: 1 }}>
              <textarea
                id="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Напишите комментарий..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--vkui--color_separator_primary)",
                  borderRadius: 12,
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: 14,
                  background: "var(--vkui--color_background_content)",
                  color: "var(--vkui--color_text_primary)",
                }}
                rows={2}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Button 
                  size="s" 
                  mode="primary" 
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>

          {/* Список комментариев */}
          {comments.map(comment => (
            <Card key={comment.id} mode="outline" style={{ marginBottom: 12, padding: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar size={40} src={comment.avatar} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Title level="3" style={{ fontSize: 14 }}>
                      {comment.author}
                    </Title>
                    <Text style={{ fontSize: 11, color: "var(--vkui--color_text_secondary)" }}>
                      {comment.date}
                    </Text>
                  </div>
                  <Text style={{ fontSize: 14, marginBottom: 8 }}>
                    {comment.text}
                  </Text>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Button mode="tertiary" size="s" before={<Icon28LikeOutline width={14} height={14} />}>
                      {comment.likes}
                    </Button>
                    <Button mode="tertiary" size="s" before={<Icon28MessageOutline width={14} height={14} />}>
                      Ответить
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <Footer>Больше комментариев не найдено</Footer>
        </Div>
      </Group>
    </Panel>
  );
}
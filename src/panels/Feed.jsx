import React, { useState } from "react";
import { Panel, Avatar, HorizontalScroll } from "@vkontakte/vkui";
import Loader from "../components/Loader";

// Данные постов
const allPosts = [
  {
    id: 1,
    author: "Снежана Зайкина",
    avatar: "https://i.pravatar.cc/150?img=1",
    description: "Описание",
    further: "Далее",
  },
  {
    id: 2,
    author: "Дмитрий Волков",
    avatar: "https://i.pravatar.cc/150?img=11",
    description: "Описание",
    further: "Далее",
  },
];

// Истории
const stories = [
  { id: 1, type: "add", name: "" },
  { id: 2, type: "initials", name: "ИИ", color: "#F4D03F" },
  { id: 3, type: "initials", name: "РН", color: "#F4D03F" },
  {
    id: 4,
    type: "photo",
    name: "",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  { id: 5, type: "photo", name: "", avatar: "https://i.pravatar.cc/150?img=5" },
];

export default function Feed({ nav, onOpenPost }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) {
    return (
      <Panel nav={nav} filled={false}>
        <Loader />
      </Panel>
    );
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    console.log("Поиск:", e.target.value);
  };

  return (
    <>
      <style>{`
        .feed-page {
          background-color: #F6F2E9;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
          padding-bottom: 20px;
        }

        /* Шапка с поиском */
        .search-header {
          padding: 16px 16px 12px 16px;
          background-color: #F6F2E9;
        }

        .search-panel {
          background-color: #F5F5F5;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .search-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 17px;
          color: #000;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
        }

        .search-input::placeholder {
          color: #000;
          opacity: 0.8;
        }

        /* Истории */
        .stories-wrapper {
          padding: 12px 0 12px 0;
        }

        .stories-scroll {
          display: flex;
          gap: 12px;
          padding: 0 16px;
        }

        .story-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 64px;
        }

        .story-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          border: 2px solid #fff;
          box-sizing: border-box;
        }

        .story-add {
          background-color: #F5F5F5;
          font-size: 32px;
          color: #000;
          font-weight: 300;
        }

        .story-initials {
          background-color: #F4D03F;
          color: #000;
        }

        .story-photo {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
        }

        /* Посты */
        .posts-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .post-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
        }

        .post-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .post-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 12px;
          object-fit: cover;
        }

        .post-author-name {
          font-size: 16px;
          font-weight: 600;
          color: #000;
        }

        .post-desc {
          font-size: 14px;
          color: #818c99;
          margin-bottom: 4px;
        }

        .post-further {
          font-size: 14px;
          color: #818c99;
          margin-bottom: 12px;
        }

        .post-images-block {
          display: flex;
          gap: 8px;
          height: 160px;
        }

        .post-img-large {
          flex: 1;
          background-color: #E1E3E6;
          border-radius: 12px;
        }

        .post-img-small {
          width: 80px;
          background-color: #E1E3E6;
          border-radius: 12px;
        }
      `}</style>

      <Panel nav={nav} filled={false}>
        <div className="feed-page">
          {/* Шапка с панелью поиска */}
          <div className="search-header">
            <div className="search-panel">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Истории */}
          <div className="stories-wrapper">
            <HorizontalScroll>
              <div className="stories-scroll">
                {stories.map((story) => (
                  <div key={story.id} className="story-item">
                    {story.type === "add" ? (
                      <div className="story-circle story-add">+</div>
                    ) : story.type === "initials" ? (
                      <div className="story-circle story-initials">
                        {story.name}
                      </div>
                    ) : (
                      <img src={story.avatar} alt="" className="story-photo" />
                    )}
                  </div>
                ))}
              </div>
            </HorizontalScroll>
          </div>

          {/* Посты */}
          <div className="posts-list">
            {allPosts.map((post) => (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <img src={post.avatar} alt="" className="post-avatar" />
                  <div className="post-author-name">{post.author}</div>
                </div>
                <div className="post-desc">{post.description}</div>
                <div className="post-further">{post.further}</div>
                <div className="post-images-block">
                  <div className="post-img-large"></div>
                  <div className="post-img-small"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </>
  );
}
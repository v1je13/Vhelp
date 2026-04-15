import React, { useState } from "react";
import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  View,
} from "@vkontakte/vkui";
import "@vkontakte/vkui/dist/vkui.css";

// Импортируем иконки
import MapIcon from "./assets/NavigationIcon/MapIcon.png";
import DiaryIcon from "./assets/NavigationIcon/DiaryIcon.png";
import ProfileIcon from "./assets/NavigationIcon/ProfileIcon.png";

import Feed from "./panels/Feed";
import Search from "./panels/Search";
import Profile from "./panels/Profile";
import TravelDetail from "./panels/TravelDetail";
import PostDetail from "./panels/PostDetail";

export default function App() {
  const [activePanel, setActivePanel] = useState("feed");
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const handleOpenTravel = (travel) => {
    setSelectedTravel(travel);
    setActivePanel("travelDetail");
  };

  const handleBackToProfile = () => {
    setSelectedTravel(null);
    setActivePanel("profile");
  };

  const handleOpenPost = (post) => {
    setSelectedPost(post);
    setActivePanel("postDetail");
  };

  const handleBackToFeed = () => {
    setSelectedPost(null);
    setActivePanel("feed");
  };

  const handleTabChange = (panel) => {
    setActivePanel(panel);
    setSelectedTravel(null);
    setSelectedPost(null);
  };

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot style={{ backgroundColor: "#F6F2E9", minHeight: "100vh" }}>
          <style>{`
            /* Агрессивное переопределение фона для всех контейнеров VKUI */
            #root, .vkui__root, .vkui__view, .vkui__panel, .vkui__panel__in,
            .vkui__group, .vkui__group__inner, .vkui__group__content,
            .vkui__cell, .vkui__fixed-layout {
              background-color: #F6F2E9 !important;
            }

            /* Убираем фон у элементов, которые должны быть прозрачными */
            .vkui__group--mode-none, .vkui__card, .vkui__panel--in {
              background-color: transparent !important;
            }

            /* Твои стили для таббара */
            .tabbar-container {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 140px;
              background-color: #F6F2E9;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding-top: 35px;
              z-index: 100;
            }

            .custom-tabbar {
              background-color: #c8d28c;
              padding: 16px 24px;
              display: flex;
              justify-content: space-around;
              align-items: center;
              width: 90%; 
              border-radius: 32px;
            }

            .custom-tab-item {
              background: #ffffff;
              border: none;
              width: 56px;
              height: 56px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
            }

            .custom-tab-item:active {
              transform: scale(0.95);
              opacity: 0.9;
            }

            .tab-icon {
              width: 28px;
              height: 28px;
              object-fit: contain;
            }

            .content-wrapper {
              min-height: 100vh;
              padding-bottom: 160px;
            }
          `}</style>

          <div className="content-wrapper">
            {/* Feed Panel */}
            {(activePanel === "feed" || activePanel === "postDetail") && (
              <View activePanel={activePanel}>
                <Feed nav="feed" onOpenPost={handleOpenPost} />
                <PostDetail
                  nav="postDetail"
                  post={selectedPost}
                  onBack={handleBackToFeed}
                />
              </View>
            )}

            {/* Search Panel */}
            {activePanel === "search" && (
              <View activePanel="search">
                <Search nav="search" />
              </View>
            )}

            {/* Profile Panel */}
            {(activePanel === "profile" || activePanel === "travelDetail") && (
              <View activePanel={activePanel}>
                <Profile nav="profile" onOpenTravel={handleOpenTravel} />
                <TravelDetail
                  nav="travelDetail"
                  travel={selectedTravel}
                  onBack={handleBackToProfile}
                />
              </View>
            )}
          </div>

          {/* Tabbar Container */}
          <div className="tabbar-container">
            <div className="custom-tabbar">
              {/* Map Icon - Feed */}
              <button
                className={`custom-tab-item ${activePanel === "feed" || activePanel === "postDetail" ? "active" : ""}`}
                onClick={() => handleTabChange("feed")}
              >
                <img src={MapIcon} alt="Карта" className="tab-icon" />
              </button>

              {/* Diary Icon - Search */}
              <button
                className={`custom-tab-item ${activePanel === "search" ? "active" : ""}`}
                onClick={() => handleTabChange("search")}
              >
                <img src={DiaryIcon} alt="Дневник" className="tab-icon" />
              </button>

              {/* Profile Icon - Profile */}
              <button
                className={`custom-tab-item ${activePanel === "profile" || activePanel === "travelDetail" ? "active" : ""}`}
                onClick={() => handleTabChange("profile")}
              >
                <img src={ProfileIcon} alt="Профиль" className="tab-icon" />
              </button>
            </div>
          </div>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

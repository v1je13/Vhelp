import React from "react";
import { Avatar, HorizontalScroll } from "@vkontakte/vkui";

const FRIENDS = [
  { id: 1, name: "Добавить", isAdd: true },
  { id: 2, name: "Друг 1", color: "#e2a610" },
  { id: 3, name: "Друг 2", color: "#e2a610" },
  { id: 4, name: "Друг 3", color: "#e2a610" },
  { id: 5, name: "Друг 4", color: "#e2a610" },
];

export default function AvatarRow() {
  return (
    <HorizontalScroll>
      <div style={{ display: "flex", gap: 12, padding: "8px 16px" }}>
        {FRIENDS.map((f) =>
          f.isAdd ? (
            <div key={f.id} style={{ textAlign: "center" }}>
              <Avatar
                size={52}
                style={{ background: "#4a5e3a", cursor: "pointer" }}
              >
                <Icon24Add fill="#fff" />
              </Avatar>
            </div>
          ) : (
            <div key={f.id} style={{ textAlign: "center" }}>
              <Avatar size={52} style={{ background: f.color }} />
            </div>
          ),
        )}
      </div>
    </HorizontalScroll>
  );
}

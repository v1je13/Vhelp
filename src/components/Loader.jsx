import React from "react";
import { Div } from "@vkontakte/vkui";

export default function Loader() {
  return (
    <Div style={{ textAlign: "center", padding: 40 }}>
      <div style={{ 
        width: 40, 
        height: 40, 
        border: "3px solid var(--vkui--color_background_secondary)",
        borderTop: "3px solid var(--vkui--color_text_accent)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "0 auto"
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Div>
  );
}
import React from "react";
import ReactDOM from "react-dom/client";
import vkBridge from "@vkontakte/vk-bridge";
import App from "./App";

vkBridge.send("VKWebAppInit");

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
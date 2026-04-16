import { createRoot } from 'react-dom/client';
import { AppConfig } from "./AppConfig.jsx";
import App from "./App.jsx";

createRoot(document.getElementById('root')).render(
  <AppConfig>
    <App />
  </AppConfig>
);


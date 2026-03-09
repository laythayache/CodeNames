import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { PlayerProvider } from "./context/PlayerContext.tsx";
import { GameProvider } from "./context/GameContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <PlayerProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </PlayerProvider>
    </ErrorBoundary>
  </StrictMode>,
);

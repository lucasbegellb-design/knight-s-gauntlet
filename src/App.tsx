import { PhaserGame } from './ui/PhaserGame';
import { GameOverOverlay, Hud } from './ui/Hud';
import { LootPopup } from './ui/LootPopup';

function App() {
  return (
    <main className="app-shell">
      <h1>Knight&rsquo;s Gauntlet</h1>
      <Hud />
      <div className="game-area">
        <PhaserGame />
        <GameOverOverlay />
        <LootPopup />
      </div>
    </main>
  );
}

export default App;

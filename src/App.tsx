import { PhaserGame } from './ui/PhaserGame';
import { GameOverOverlay, Hud } from './ui/Hud';

function App() {
  return (
    <main className="app-shell">
      <h1>Knight&rsquo;s Gauntlet</h1>
      <Hud />
      <div className="game-area">
        <PhaserGame />
        <GameOverOverlay />
      </div>
    </main>
  );
}

export default App;

import { PhaserGame } from './ui/PhaserGame';
import { GameOverOverlay, Hud } from './ui/Hud';
import { LootPopup } from './ui/LootPopup';
import { Hub } from './ui/Hub';
import { ClassSelect } from './ui/ClassSelect';
import { useMetaStore } from './store/metaStore';

function App() {
  const screen = useMetaStore((s) => s.screen);

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="app-header-glyph">⚔</span>
        <h1>
          Knight<span className="app-title-accent">&rsquo;s</span> Gauntlet
        </h1>
        <span className="app-header-glyph">⚔</span>
      </header>

      <div className="screen-fade" key={screen}>
        {screen === 'hub' && <Hub />}
        {screen === 'classSelect' && <ClassSelect />}
        {screen === 'run' && (
          <>
            <Hud />
            <div className="game-area">
              <PhaserGame />
              <GameOverOverlay />
              <LootPopup />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default App;

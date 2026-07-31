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
      <h1>Knight&rsquo;s Gauntlet</h1>
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
    </main>
  );
}

export default App;

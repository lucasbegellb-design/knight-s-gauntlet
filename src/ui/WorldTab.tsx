import { allContinents } from '../data/continents';
import { allZones } from '../data/zones';

function waveRangeLabel(zoneId: string): string {
  const index = allZones.findIndex((z) => z.id === zoneId);
  const zone = allZones[index];
  if (!zone) return '';
  const next = allZones[index + 1];
  return next ? `Waves ${zone.waveStart}–${next.waveStart - 1}` : `Wave ${zone.waveStart}+`;
}

export function WorldTab() {
  return (
    <div className="hub-panel-grid">
      {allContinents.map((continent) => (
        <div key={continent.id} className="hub-card world-continent-card">
          <div className="hub-card-title">{continent.name}</div>
          <div className="world-continent-tagline">{continent.tagline}</div>
          <p className="hub-item-description">{continent.description}</p>

          <div className="world-zone-list">
            {continent.zoneIds.map((zoneId) => {
              const zone = allZones.find((z) => z.id === zoneId);
              if (!zone) return null;
              return (
                <div key={zone.id} className="world-zone-row">
                  <div>
                    <div className="hub-item-name">{zone.name}</div>
                    <div className="hub-item-description">{zone.description}</div>
                  </div>
                  <span className="world-zone-wave">{waveRangeLabel(zone.id)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

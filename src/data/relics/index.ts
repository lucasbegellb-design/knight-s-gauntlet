import { Registry } from '../registry';
import type { RelicDefinition } from '../relic.types';
import { emberFang } from './emberFang';
import { cinderCore } from './cinderCore';
import { wildfireHeart } from './wildfireHeart';
import { luckyCoin } from './luckyCoin';
import { killerInstinct } from './killerInstinct';
import { executionersEdge } from './executionersEdge';
import { vampiricFang } from './vampiricFang';
import { crimsonAegis } from './crimsonAegis';
import { bloodlustFang } from './bloodlustFang';
import { merchantsCharm } from './merchantsCharm';
import { scholarsInsight } from './scholarsInsight';
import { goldenOpportunity } from './goldenOpportunity';
import { swiftBoots } from './swiftBoots';
import { adrenalineRush } from './adrenalineRush';
import { ironSkin } from './ironSkin';
import { guardiansBlessing } from './guardiansBlessing';
import { thornmailWard } from './thornmailWard';
import { phoenixHeart } from './phoenixHeart';

export const relicRegistry = new Registry<RelicDefinition>();

relicRegistry.registerAll([
  emberFang,
  cinderCore,
  wildfireHeart,
  luckyCoin,
  killerInstinct,
  executionersEdge,
  vampiricFang,
  crimsonAegis,
  bloodlustFang,
  merchantsCharm,
  scholarsInsight,
  goldenOpportunity,
  swiftBoots,
  adrenalineRush,
  ironSkin,
  guardiansBlessing,
  thornmailWard,
  phoenixHeart,
]);

export const allRelics = relicRegistry.all();

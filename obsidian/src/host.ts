import type { AtlasEntityKey, AtlasSelection } from '../../src/atlasIntegration';
import type { AtlasSettings, VaultNote } from './model';

export interface AtlasSnapshot { notes: VaultNote[]; settings: AtlasSettings }
export interface AtlasHost {
  getSnapshot: () => AtlasSnapshot;
  subscribe: (listener: () => void) => () => void;
  openNote: (path: string) => void;
  openEntity: (key: AtlasEntityKey) => void;
  openEntityNote: (selection: AtlasSelection) => void;
  linkNote: (selection: AtlasSelection) => void;
  newResearch: (keys: AtlasEntityKey[]) => void;
  newInvestigation: (selections: AtlasSelection[]) => void;
  linkForSelection: (selection: AtlasSelection | null) => string;
}

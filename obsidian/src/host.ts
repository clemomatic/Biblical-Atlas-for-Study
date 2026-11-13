import type { AtlasEntityKey, AtlasEntityType, AtlasMapEditing, AtlasSelection } from '../../src/atlasIntegration';
import type { AtlasWorkspace } from './catalog';
import type { MapTileCache } from './MapTiles';
import type { MapBounds } from './tileMath';
import type { AtlasSettings, VaultNote } from './model';
import type { StudyFactIndexSnapshot } from './studyFactIndex.ts';

export interface AtlasSnapshot { notes: VaultNote[]; settings: AtlasSettings; atlas: AtlasWorkspace; studyFacts: StudyFactIndexSnapshot }
export interface AtlasHost {
  getSnapshot: () => AtlasSnapshot;
  subscribe: (listener: () => void) => () => void;
  openNote: (path: string) => void;
  openBibleLab: () => Promise<void>;
  openEntity: (key: AtlasEntityKey) => void;
  openEntityNote: (selection: AtlasSelection) => void;
  linkNote: (selection: AtlasSelection) => void;
  newResearch: (keys: AtlasEntityKey[]) => void;
  newInvestigation: (selections: AtlasSelection[]) => void;
  linkForSelection: (selection: AtlasSelection | null) => string;
  manageAtlas: () => void;
  editEntity: (selection: AtlasSelection) => void;
  editEpisodeConnections: (eventId: string) => void;
  openPersonEpisodes: (personId: string) => void;
  openPlaceEpisodes: (placeId: string) => void;
  newAtlasEntity: (type: AtlasEntityType) => void;
  mapActions: AtlasMapEditing;
  renderMarkdown: NonNullable<import('../../src/atlasIntegration').AtlasIntegration['renderMarkdown']>;
  maps: MapTileCache;
  openMapDownloads: () => void;
  setMapViewport: (bounds: MapBounds) => void;
}

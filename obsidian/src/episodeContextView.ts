import type { AtlasEntityKey } from '../../src/atlasIntegration.ts';
import type { AtlasWorkspace } from './catalog.ts';
import { resolveEntity } from './catalog.ts';
import { HISTORICAL_INDEX, HISTORICAL_PEOPLE, HISTORICAL_SOURCE_CATALOG, REVIEWED_HISTORICAL_EVENTS } from '../../src/data/historicalStudyData.ts';
import { buildEpisodeContext } from './episodeContext.ts';
import type { PersonalEpisodeConnection } from './episodeConnections.ts';

export interface EpisodeContextActions {
  openEntity: (key: AtlasEntityKey) => void;
  readReference: (reference: string) => void;
  editConnections: (eventId: string) => void;
  personalConnections: readonly PersonalEpisodeConnection[];
}

/**
 * Lightweight, native-DOM contextual reader. The source note and corpus are
 * never modified. Everything visible comes from recorded facts or is marked
 * as unknown; geographic event mentions are not treated as personal presence.
 */
export function renderEpisodeContext(
  container: HTMLElement,
  eventId: string,
  workspace: AtlasWorkspace,
  actions: EpisodeContextActions
): void {
  container.empty();
  container.addClass('jwsd-episode');
  const context = buildEpisodeContext({
    eventId,
    reviewedEvents: REVIEWED_HISTORICAL_EVENTS,
    legacyEvents: workspace.dataset.events,
    people: workspace.dataset.people.length ? workspace.dataset.people : HISTORICAL_PEOPLE,
    places: workspace.dataset.places,
    presences: HISTORICAL_INDEX.presences,
    sources: HISTORICAL_SOURCE_CATALOG
  });
  if (!context) {
    container.createEl('p', { text: 'Épisode introuvable dans l’Atlas : ' + eventId });
    return;
  }
  const header = container.createDiv({ cls: 'jwsd-episode-header' });
  header.createDiv({ cls: 'jwsd-episode-eyebrow', text: 'ATLAS · CONTEXTE ET CONNEXIONS' });
  header.createEl('h3', { text: context.title });
  header.createDiv({ cls: 'jwsd-episode-period', text: context.periodLabel });
  const eventKey: AtlasEntityKey = ('event:' + eventId) as AtlasEntityKey;
  if (resolveEntity(workspace.catalog, eventKey)) {
    const button = header.createEl('button', { text: 'Explorer dans l’Atlas' });
    button.addEventListener('click', () => actions.openEntity(eventKey));
  }
  if (context.description) container.createEl('p', { text: context.description });

  const people = container.createDiv({ cls: 'jwsd-episode-section' });
  people.createEl('h4', { text: 'Personnes concernées' });
  if (!context.participants.length) {
    people.createEl('p', { cls: 'jwsd-episode-muted', text: 'Aucun participant identifié et lié à cet épisode.' });
  }
  for (const person of context.participants) {
    const card = people.createDiv({ cls: 'jwsd-episode-person' });
    const line = card.createDiv({ cls: 'jwsd-episode-person-heading' });
    const personKey: AtlasEntityKey | null = person.personId ? ('person:' + person.personId) as AtlasEntityKey : null;
    if (personKey && resolveEntity(workspace.catalog, personKey)) {
      const button = line.createEl('button', { text: person.name, cls: 'jwsd-episode-entity' });
      button.addEventListener('click', () => actions.openEntity(personKey));
    } else {
      line.createEl('strong', { text: person.name });
    }
    card.createDiv({ cls: 'jwsd-episode-age', text: 'Âge : ' + person.age.label });
    if (person.locations.length) {
      for (const place of person.locations) {
        const row = card.createDiv({ cls: 'jwsd-episode-presence' });
        row.createSpan({ text: 'Présence documentée : ' });
        const placeKey: AtlasEntityKey = ('place:' + place.placeId) as AtlasEntityKey;
        if (resolveEntity(workspace.catalog, placeKey)) {
          const button = row.createEl('button', { cls: 'jwsd-episode-entity', text: place.name });
          button.addEventListener('click', () => actions.openEntity(placeKey));
        } else {
          row.createSpan({ text: place.name });
        }
        row.createSpan({ cls: 'jwsd-episode-muted', text: ' · ' + place.certainty });
      }
    } else {
      card.createDiv({ cls: 'jwsd-episode-muted', text: 'Lieu individuel non établi pour cet épisode.' });
    }
  }

  if (context.places.length) {
    const places = container.createDiv({ cls: 'jwsd-episode-section' });
    places.createEl('h4', { text: 'Lieux associés au récit' });
    places.createEl('p', { cls: 'jwsd-episode-muted', text: 'Cette liste ne prouve pas la présence de chaque participant dans ces lieux.' });
    const list = places.createEl('ul');
    for (const place of context.places) {
      const row = list.createEl('li');
      const key: AtlasEntityKey | null = place.placeId ? ('place:' + place.placeId) as AtlasEntityKey : null;
      if (key && resolveEntity(workspace.catalog, key)) {
        const button = row.createEl('button', { cls: 'jwsd-episode-entity', text: place.name });
        button.addEventListener('click', () => actions.openEntity(key));
      } else row.setText(place.name);
    }
  }

  if (context.references.length || context.sources.length) {
    const sources = container.createDiv({ cls: 'jwsd-episode-section' });
    sources.createEl('h4', { text: 'Sources et références' });
    for (const reference of context.references) {
      const button = sources.createEl('button', { cls: 'jwsd-episode-reference', text: reference });
      button.addEventListener('click', () => actions.readReference(reference));
    }
    for (const source of context.sources) {
      if (source.url && /^https?:\/\//i.test(source.url)) {
        sources.createEl('a', {
          cls: 'jwsd-episode-reference', text: source.label, href: source.url,
          attr: { target: '_blank', rel: 'noopener noreferrer' }
        });
      } else sources.createSpan({ cls: 'jwsd-episode-reference', text: source.label });
    }
  }
  const personal = container.createDiv({ cls: 'jwsd-episode-section' });
  const heading=personal.createDiv({cls:'jwsd-episode-person-heading'});
  heading.createEl('h4',{text:'Mes connexions d’étude'});
  const edit=heading.createEl('button',{text:'Ajouter ou modifier',cls:'jwsd-episode-edit'});
  edit.addEventListener('click',()=>actions.editConnections(eventId));
  if (!actions.personalConnections.length) {
    personal.createEl('p',{cls:'jwsd-episode-muted',text:'Aucune connexion personnelle enregistrée. Ajoute une personne, un lieu et une référence pour commencer.'});
  }
  for(const item of actions.personalConnections){
    const card=personal.createDiv({cls:'jwsd-episode-person'});
    const personKey:AtlasEntityKey=('person:'+item.personId) as AtlasEntityKey;
    const person=resolveEntity(workspace.catalog,personKey);
    if(person){
      const button=card.createEl('button',{cls:'jwsd-episode-entity',text:person.title});
      button.addEventListener('click',()=>actions.openEntity(personKey));
    }else card.createEl('strong',{text:item.personId});
    if(item.placeId){
      const placeKey:AtlasEntityKey=('place:'+item.placeId) as AtlasEntityKey;
      const place=resolveEntity(workspace.catalog,placeKey);
      const line=card.createDiv();
      line.createSpan({text:'Lieu mentionné dans mon étude : '});
      if(place){
        const button=line.createEl('button',{cls:'jwsd-episode-entity',text:place.title});
        button.addEventListener('click',()=>actions.openEntity(placeKey));
      }else line.createSpan({text:item.placeId});
    }else card.createDiv({cls:'jwsd-episode-muted',text:'Aucun lieu personnel précisé.'});
    const reference=card.createDiv({cls:'jwsd-episode-age'});
    reference.createSpan({text:'Source notée : '});
    const read=reference.createEl('button',{cls:'jwsd-episode-entity',text:item.reference});
    read.addEventListener('click',()=>actions.readReference(item.reference));
    if(item.note)card.createEl('p',{text:item.note});
    card.createDiv({cls:'jwsd-episode-muted',text:'Ajout personnel — à distinguer des données historiques relues.'});
  }
  if (context.warnings.length) {
    const limits = container.createDiv({ cls: 'jwsd-episode-limits' });
    limits.createEl('strong', { text: 'Données à compléter' });
    for (const warning of context.warnings) limits.createEl('p', { text: warning });
  }
}

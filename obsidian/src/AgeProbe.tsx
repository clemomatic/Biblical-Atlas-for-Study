import { useMemo, useState } from 'react';
import type { BiblicalPerson } from '../../src/domain/history/types';
import type { AtlasSelection } from '../../src/atlasIntegration';
import { probeDate, type CursorAge, type ProbeDate } from './ages';

export function AgeProbe({ date, ages, people, selection, pinned, onDate, onFollow, onPerson }: {
  date: ProbeDate; ages: Map<string, CursorAge>; people: BiblicalPerson[]; selection: AtlasSelection | null; pinned: boolean;
  onDate: (date: ProbeDate) => void; onFollow: () => void; onPerson: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false), [editing, setEditing] = useState(false);
  const [year, setYear] = useState(String(date.year)), [month, setMonth] = useState(''), [day, setDay] = useState('');
  const [query, setQuery] = useState(''), [all, setAll] = useState(false), [error, setError] = useState('');
  const selectedAge = selection?.type === 'person' ? ages.get(selection.id) : undefined;
  const relevant = useMemo(() => people.filter(person => (!query || person.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))) && (all || ages.get(person.id)?.status === 'living' || ages.get(person.id)?.status === 'unknown')), [people, query, all, ages]);
  return <section className="atlas-age-probe" aria-label="Âges au repère chronologique">
    <div className="atlas-age-bar"><span><strong>Âges au {date.label}</strong>{selectedAge && <span className="atlas-age-selected" title={selectedAge.explanation}>{selection!.title} · {selectedAge.label}</span>}</span><div>
      <button type="button" onClick={() => { setYear(String(date.year)); setMonth(date.month ? String(date.month) : ''); setDay(date.day ? String(date.day) : ''); setEditing(value => !value); setError(''); }}>Date précise</button>
      {pinned && <button type="button" onClick={onFollow}>Suivre la frise</button>}
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Replier les âges' : 'Tous les personnages'}</button>
    </div></div>
    {editing && <form className="atlas-age-date" onSubmit={event => { event.preventDefault(); try { onDate(probeDate(Number(year), month ? Number(month) : undefined, day ? Number(day) : undefined)); setEditing(false); setError(''); } catch (error) { setError(error instanceof Error ? error.message : 'Date invalide.'); } }}>
      <label>Année<input aria-label="Année du repère d’âge" type="number" value={year} onChange={event => setYear(event.target.value)} /></label><label>Mois<input aria-label="Mois du repère d’âge" type="number" min="1" max="12" value={month} onChange={event => setMonth(event.target.value)} /></label><label>Jour<input aria-label="Jour du repère d’âge" type="number" min="1" max="31" value={day} onChange={event => setDay(event.target.value)} /></label><button type="submit">Appliquer la date</button><small>Année négative avant notre ère. Mois et jour facultatifs, en calendrier civil.</small>
    </form>}
    {error && <p role="alert" className="atlas-note-warning">{error}</p>}
    {expanded && <div className="atlas-age-list"><div className="atlas-age-search"><input aria-label="Chercher un personnage pour son âge" placeholder="Chercher un personnage…" value={query} onChange={event => setQuery(event.target.value)} /><label><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} />Avant et après leur vie</label></div>
      <div className="atlas-age-grid">{relevant.map(person => { const age = ages.get(person.id)!; return <button type="button" data-person-id={person.id} key={person.id} title={age.explanation} onClick={() => onPerson(person.id)}><strong>{person.name}</strong><span>{age.label}</span></button>; })}{!relevant.length && <p>Aucun personnage ne correspond à cette recherche.</p>}</div>
      <p>Les âges suivent les dates de tes fiches. Une naissance approximative produit une estimation ou une fourchette ; aucune date n’est inventée pour compléter un calcul.</p>
    </div>}
  </section>;
}

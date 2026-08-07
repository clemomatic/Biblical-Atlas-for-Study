import { useEffect, useState } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Map as MapIcon,
  PanelLeft,
  Search
} from 'lucide-react';
import { ActiveTab } from '../types';
import { AtlasMark, IconButton } from './ui/AtlasUi';

interface AppHeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenFilters: () => void;
  onOpenSearch: () => void;
}

export function AppHeader({
  activeTab,
  onChangeTab,
  onOpenFilters,
  onOpenSearch
}: AppHeaderProps) {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!hasCopied) return;
    const timeout = window.setTimeout(() => setHasCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [hasCopied]);

  const copyView = async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
    } catch {
      // Le navigateur peut refuser le presse-papiers : l’URL reste partageable.
    }
  };

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center border-b border-[var(--color-stone)] bg-[color-mix(in_srgb,var(--color-paper)_94%,transparent)] px-2.5 backdrop-blur-xl sm:px-4">
      <IconButton
        label="Ouvrir les filtres"
        onClick={onOpenFilters}
        className="mr-1 lg:hidden"
      >
        <PanelLeft className="size-5" />
      </IconButton>

      <div className="flex min-w-0 items-center gap-3">
        <AtlasMark className="size-9 sm:size-10" />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold tracking-[-0.015em] text-[var(--color-ink)] sm:text-base">
            Atlas biblique
          </h1>
          <p className="hidden text-[11px] font-medium text-[var(--color-ink-muted)] sm:block">
            Frise historique et géographie documentaire
          </p>
        </div>
      </div>

      <nav
        className="ml-5 hidden items-center rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-1 md:flex"
        aria-label="Vue principale"
      >
        {[
          { id: 'timeline' as const, label: 'Frise', icon: Clock3 },
          { id: 'map' as const, label: 'Carte', icon: MapIcon }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-pressed={isActive}
              className={`flex min-h-9 items-center gap-2 rounded-[7px] px-4 text-[13px] font-semibold ${
                isActive
                  ? 'bg-[var(--color-paper)] text-[var(--color-primary-dark)] shadow-[var(--shadow-low)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-10 w-10 items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] px-3 text-left text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-stone-light)] sm:w-64 lg:w-80"
        aria-label="Ouvrir la recherche globale"
      >
        <Search className="size-4 shrink-0 text-[var(--color-primary)]" />
        <span className="hidden flex-1 truncate sm:block">
          Rechercher dans l’atlas
        </span>
        <span className="hidden text-[11px] font-semibold text-[var(--color-ink-muted)] lg:block">
          {typeof window !== 'undefined' && /mac/i.test(window.navigator.userAgent) ? '⌘K' : 'Ctrl+K'}
        </span>
      </button>

      <IconButton
        label={hasCopied ? 'Lien copié' : 'Copier le lien de cette vue'}
        onClick={() => void copyView()}
        className="ml-1"
      >
        {hasCopied ? (
          <Check className="size-4 text-[var(--color-mineral)]" />
        ) : (
          <Copy className="size-4" />
        )}
      </IconButton>
    </header>
  );
}

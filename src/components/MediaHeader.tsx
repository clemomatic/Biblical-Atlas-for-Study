import React from 'react';
import { MapPin } from 'lucide-react';
import { MediaAsset } from '../types';

interface MediaHeaderProps {
  title: string;
  type: string;
  media?: MediaAsset[];
  coordinates?: [number, number];
  accentColor?: string;
}

export function MediaHeader({
  title,
  type,
  media,
  coordinates,
  accentColor = 'var(--color-bronze)'
}: MediaHeaderProps) {
  const primaryMedia = media?.[0];

  return (
    <header className="relative overflow-hidden bg-[var(--color-primary-dark)] text-[var(--color-paper)]">
      <div className="relative h-36 sm:h-44">
        {primaryMedia ? (
          <img
            src={primaryMedia.src}
            alt={primaryMedia.alt}
            className="size-full object-cover"
            style={{
              objectPosition: primaryMedia.focalPoint
                ? `${primaryMedia.focalPoint.x}% ${primaryMedia.focalPoint.y}%`
                : undefined
            }}
          />
        ) : (
          <div
            className="size-full opacity-90"
            aria-hidden="true"
            style={{
              backgroundImage: `
                radial-gradient(circle at 64% 42%, ${accentColor} 0 3px, transparent 4px),
                linear-gradient(25deg, transparent 48%, rgb(255 253 248 / 12%) 49% 50%, transparent 51%),
                linear-gradient(115deg, transparent 48%, rgb(255 253 248 / 9%) 49% 50%, transparent 51%),
                radial-gradient(circle at 30% 90%, rgb(255 253 248 / 10%), transparent 42%)
              `,
              backgroundSize: 'auto, 42px 42px, 54px 54px, auto'
            }}
          >
            <span className="absolute left-[64%] top-[42%] grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/10">
              <MapPin className="size-4" />
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary-dark)] via-transparent to-transparent" />
        {coordinates && (
          <p className="tabular-nums absolute bottom-3 right-4 text-xs text-white/68">
            {coordinates[0].toFixed(3)} · {coordinates[1].toFixed(3)}
          </p>
        )}
      </div>

      <div className="relative px-5 pb-5">
        <p className="atlas-kicker !text-[var(--color-stone)]">{type}</p>
        <h2 className="mt-1 font-[var(--font-editorial)] text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em]">
          {title}
        </h2>
        {primaryMedia?.caption && (
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            {primaryMedia.caption}
          </p>
        )}
      </div>
    </header>
  );
}

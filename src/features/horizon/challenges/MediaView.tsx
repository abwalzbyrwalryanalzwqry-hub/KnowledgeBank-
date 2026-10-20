import React from 'react';
import type { MediaSpec } from '../../../content/types';

/** عرض آمن للوسائط: لا يُحقن أي HTML من ملفات المحتوى. */
export function MediaView({ media }: { media: MediaSpec }) {
  if (media.type === 'emoji') {
    return (
      <figure className="flex flex-col items-center gap-2 py-3">
        <div className="text-5xl sm:text-6xl tracking-widest leading-snug text-center select-none" role="img" aria-label={media.caption || 'صورة اللغز'}>
          {media.value}
        </div>
        {media.caption && <figcaption className="text-xs text-slate-400">{media.caption}</figcaption>}
      </figure>
    );
  }
  if (media.type === 'sequence') {
    return (
      <div className="flex flex-wrap justify-center gap-2 py-3" role="list" aria-label="السلسلة">
        {media.items.map((it, i) => (
          <span
            key={i}
            role="listitem"
            className={`min-w-12 h-12 px-3 inline-flex items-center justify-center rounded-xl border text-lg sm:text-xl font-bold font-num ${
              it === '؟' ? 'border-amber-400/70 bg-amber-400/10 text-amber-300 animate-pulse' : 'border-slate-700 bg-slate-800/80 text-white'
            }`}
          >
            {it}
          </span>
        ))}
      </div>
    );
  }
  return (
    <figure className="flex justify-center py-3">
      <svg viewBox={media.viewBox} className="w-full max-w-xs h-auto" role="img" aria-label={media.alt}>
        {media.shapes.map((s, i) => {
          switch (s.shape) {
            case 'rect':
              return <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
            case 'circle':
              return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
            case 'line':
              return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke ?? '#fff'} strokeWidth={s.strokeWidth ?? 2} strokeLinecap="round" />;
            case 'polygon':
              return <polygon key={i} points={s.points} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinejoin="round" />;
            case 'text':
              return <text key={i} x={s.x} y={s.y} fill={s.fill ?? '#fff'} fontSize={s.fontSize ?? 16}>{s.text}</text>;
          }
        })}
      </svg>
    </figure>
  );
}

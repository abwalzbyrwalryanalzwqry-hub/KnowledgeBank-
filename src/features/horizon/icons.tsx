import React from 'react';
import {
  Lightbulb, Landmark, Earth, FlaskConical, BookOpen, Calculator, PenLine, MessageSquareQuote, Trophy, Cpu,
  Brain, Grid3x3, Search, KeyRound, ArrowDownUp, Image, Shapes, Eye, Layers, Sunrise, Puzzle, Orbit, Sparkles,
  type LucideIcon,
} from 'lucide-react';

/** قائمة صريحة بالأيقونات المسموح بها في ملفات المحتوى (تحافظ على صغر الحزمة). */
const ICONS: Record<string, LucideIcon> = {
  Lightbulb, Landmark, Earth, FlaskConical, BookOpen, Calculator, PenLine, MessageSquareQuote, Trophy, Cpu,
  Brain, Grid3x3, Search, KeyRound, ArrowDownUp, Image, Shapes, Eye, Layers, Sunrise, Puzzle, Orbit, Sparkles,
};

export const ALLOWED_ICON_NAMES = Object.keys(ICONS);

export function ContentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}

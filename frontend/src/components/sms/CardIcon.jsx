import React from 'react';
import { ClipboardCheck, History } from 'lucide-react';

/** Icon tile for the dashboard cards: a lucide icon in a soft amber square */
export default function CardIcon({ icon: Icon, label }) {
  const Glyph = Icon || (label && label.endsWith('History') ? History : ClipboardCheck);
  return (
    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
      <Glyph size={22} strokeWidth={1.75} />
    </div>
  );
}

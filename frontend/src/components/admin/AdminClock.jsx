import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const AdminClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-slate-800 rounded-xl p-4 text-white">
      <p className="text-sm font-semibold">{format(now, 'EEEE, d MMMM yyyy')}</p>
      <p className="text-2xl font-bold mt-1">{format(now, 'h:mm a')}</p>
      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        Live
      </p>
    </div>
  );
};

export default AdminClock;

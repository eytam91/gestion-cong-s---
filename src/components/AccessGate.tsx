import React from 'react';

interface AccessGateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

/** Full-screen state shown instead of the app when the viewer has no access. */
export const AccessGate: React.FC<AccessGateProps> = ({ icon, title, message, action }) => (
  <div className="min-h-screen bg-stone-100/70 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-10 max-w-md w-full space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto">
        {icon}
      </div>
      <h1 className="text-lg font-bold text-stone-900">{title}</h1>
      <p className="text-xs text-stone-500 leading-relaxed">{message}</p>
      {action}
    </div>
  </div>
);

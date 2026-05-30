import { PanelLeft, Settings } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onSettings: () => void;
  children: React.ReactNode;
}

export function Sidebar({ open, onToggle, onSettings, children }: SidebarProps) {
  return (
    <div
      className="fixed inset-y-0 left-0 z-30 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300"
      style={{ width: open ? '300px' : '0', maxWidth: '85vw' }}
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)] h-14 shrink-0">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] whitespace-nowrap overflow-hidden">
          MiMo Pad
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onSettings}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="设置"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <PanelLeft size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

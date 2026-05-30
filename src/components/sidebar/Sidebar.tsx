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
      style={{ width: open ? '320px' : '0', maxWidth: '90vw' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] min-h-[56px] shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)] whitespace-nowrap overflow-hidden">
          MiMo Pad
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="p-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-w-[44px] min-h-[44px]"
            title="设置"
          >
            <Settings size={22} />
          </button>
          <button
            onClick={onToggle}
            className="p-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-w-[44px] min-h-[44px]"
          >
            <PanelLeft size={22} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

import { AlertTriangle, Zap } from 'lucide-react';

interface YoloConfirmProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function YoloConfirm({ visible, onConfirm, onCancel }: YoloConfirmProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] border-2 border-red-500/50 shadow-2xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-400">⚡ YOLO 模式</h2>
            <p className="text-sm text-[var(--text-secondary)]">所有操作自动执行，你承担全部风险</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-[var(--text-secondary)] space-y-2 mb-5">
          <p className="text-red-300 font-medium text-base">YOLO 模式安全规则：</p>
          <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)] text-xs">
            <li>AI 必须先 <code className="text-xs bg-red-500/10 px-1 rounded">read_file</code> 了解项目架构</li>
            <li>验证所有文件路径和依赖存在后再修改</li>
            <li>永不递归删除目录 (<code className="text-xs bg-red-500/10 px-1 rounded">rm -rf</code>)</li>
            <li>每次大范围操作前确认影响范围</li>
            <li>不确定时回退到"执行模式"确认</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] text-base font-medium hover:bg-[var(--bg-hover)] transition-colors min-h-[52px]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-base font-medium transition-colors flex items-center justify-center gap-2 min-h-[52px]"
          >
            <Zap size={18} />
            确认进入 YOLO
          </button>
        </div>
      </div>
    </div>
  );
}

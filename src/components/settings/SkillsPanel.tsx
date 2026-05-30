import { useState, useEffect } from 'react';
import { Search, Download, Trash2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import type { ExportedSkill } from '../../types';
import { storage } from '../../services/storage';
import { nanoid } from 'nanoid';

export function SkillsPanel() {
  const [skills, setSkills] = useState<ExportedSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ full_name: string; description: string; html_url: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    const all = await storage.getAllSkills();
    setSkills(all);
    setLoading(false);
  };

  const toggleSkill = async (skill: ExportedSkill) => {
    const updated = { ...skill, enabled: !skill.enabled };
    await storage.saveSkill(updated);
    setSkills((prev) => prev.map((s) => s.id === skill.id ? updated : s));
  };

  const deleteSkill = async (id: string) => {
    await storage.deleteSkill(id);
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const resp = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}+topic:ai-skills&sort=stars&per_page=10`
      );
      const data = await resp.json();
      const items = (data.items || []).slice(0, 10);
      setSearchResults(items);
      if (items.length === 0) {
        const fallback = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}+skill+opencode&sort=stars&per_page=10`
        );
        const fb = await fallback.json();
        setSearchResults((fb.items || []).slice(0, 10));
      }
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const installFromRepo = async (fullName: string) => {
    setInstalling(fullName);
    try {
      const [owner, repo] = fullName.split('/');
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`);
      const files = await resp.json() as { name: string; path: string; type: string; download_url?: string }[];

      let installed = 0;
      for (const f of (Array.isArray(files) ? files : [])) {
        if (f.name.endsWith('.md') && f.download_url) {
          const contentResp = await fetch(f.download_url);
          const content = await contentResp.text();
          const skill: ExportedSkill = {
            id: nanoid(),
            name: f.name.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: `Imported from ${fullName}`,
            content,
            source: fullName,
            installedAt: Date.now(),
            enabled: true,
          };
          await storage.saveSkill(skill);
          installed++;
        }
      }
      await loadSkills();
      alert(installed > 0 ? `已安装 ${installed} 个技能` : '该仓库中没有 .md 文件');
    } catch (e) {
      alert('安装失败: ' + (e instanceof Error ? e.message : 'unknown'));
    }
    setInstalling(null);
  };

  const handleManualImport = async () => {
    if (!importText.trim() || !importName.trim()) return;
    const skill: ExportedSkill = {
      id: nanoid(),
      name: importName.trim(),
      description: '手动导入',
      content: importText.trim(),
      installedAt: Date.now(),
      enabled: true,
    };
    await storage.saveSkill(skill);
    setImportName('');
    setImportText('');
    setShowImport(false);
    await loadSkills();
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] p-4">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">技能 Skills</h3>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-light)] text-sm font-medium hover:bg-[var(--accent-border)] transition-colors min-h-[44px]"
        >
          <Download size={16} />
          手动导入
        </button>
      </div>

      {showImport && (
        <div className="p-4 rounded-xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--bg-tertiary)] space-y-3">
          <input
            type="text" value={importName} onChange={(e) => setImportName(e.target.value)}
            placeholder="技能名称"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[44px]"
          />
          <textarea
            value={importText} onChange={(e) => setImportText(e.target.value)}
            placeholder="粘贴技能内容 (Markdown)..."
            rows={6}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none font-mono"
          />
          <button
            onClick={handleManualImport}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-light)] transition-colors"
          >
            导入技能
          </button>
        </div>
      )}

      <div className="space-y-1">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">已安装 ({skills.length})</h4>
        {skills.map((skill) => (
          <div key={skill.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">{skill.name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate">{skill.description}</div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => toggleSkill(skill)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                {skill.enabled ? <ToggleRight size={20} className="text-[var(--accent-light)]" /> : <ToggleLeft size={20} className="text-[var(--text-muted)]" />}
              </button>
              <button onClick={() => deleteSkill(skill.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">从 GitHub 发现</h4>
        <div className="flex gap-2">
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索技能仓库..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[44px]"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-light)] disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <Search size={18} />
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((repo) => (
              <div key={repo.full_name} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{repo.full_name}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{repo.description || '无描述'}</div>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--accent-light)] mt-1">
                      <ExternalLink size={10} /> GitHub
                    </a>
                  </div>
                  <button
                    onClick={() => installFromRepo(repo.full_name)}
                    disabled={installing === repo.full_name}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-light)] text-xs hover:bg-[var(--accent-border)] disabled:opacity-50 transition-colors whitespace-nowrap min-h-[36px]"
                  >
                    {installing === repo.full_name ? '安装中...' : '安装'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

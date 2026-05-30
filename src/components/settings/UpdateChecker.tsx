import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Check } from 'lucide-react';

const CURRENT_VERSION = '2.0.0';
const GITHUB_REPO = 'TellTree-404/mimo-pad';

export function UpdateChecker() {
  const [status, setStatus] = useState<'checking' | 'available' | 'downloading' | 'installing' | 'uptodate' | 'error'>('checking');
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    try {
      const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const latest = (data.tag_name || '').replace(/^v/, '');
      setLatestVersion(latest);

      if (latest && latest !== CURRENT_VERSION) {
        setStatus('available');
        const apkAsset = data.assets?.find((a: { name: string; browser_download_url: string }) => a.name.endsWith('.apk'));
        if (apkAsset) {
          setDownloadUrl(apkAsset.browser_download_url);
        } else {
          const workflowResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/artifacts?per_page=3`);
          const artifacts = await workflowResp.json();
          const apk = (artifacts.artifacts || []).find((a: { name: string }) => a.name === 'MiMo-Pad-Agent');
          if (apk && !apk.expired) {
            setDownloadUrl(`https://nightly.link/${GITHUB_REPO}/workflows/build-apk/master/MiMo-Pad-Agent.zip`);
          }
        }
      } else {
        setStatus('uptodate');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    setStatus('downloading');
    try {
      const url = downloadUrl || `https://nightly.link/${GITHUB_REPO}/workflows/build-apk/master/MiMo-Pad-Agent.zip`;
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MiMo-Pad-Agent.apk';
      a.click();
      setStatus('installing');
      setTimeout(() => setStatus('uptodate'), 3000);
    } catch {
      setStatus('error');
    }
  }, [downloadUrl]);

  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <RefreshCw size={12} className="animate-spin" />
        检查中...
      </span>
    );
  }

  if (status === 'uptodate') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
        <Check size={12} />
        已是最新
      </span>
    );
  }

  if (status === 'available') {
    return (
      <button
        onClick={handleUpdate}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-light)] transition-colors animate-pulse-shadow"
      >
        <Download size={16} />
        更新至 v{latestVersion}
      </button>
    );
  }

  if (status === 'downloading' || status === 'installing') {
    return (
      <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--accent-light)]">
        <RefreshCw size={10} className="animate-spin" />
        {status === 'downloading' ? '下载中...' : '安装中...'}
      </div>
    );
  }

  return (
    <button onClick={checkForUpdates} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
      检查失败，点此重试
    </button>
  );
}

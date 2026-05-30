export interface AppRegistryEntry {
  id: string;
  name: string;
  packageName: string;
  intentUri: string;
  searchIntentTemplate?: string;
  category: 'music' | 'browser' | 'productivity' | 'media' | 'custom';
}

export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: 'neteasemusic', name: '网易云音乐', packageName: 'com.netease.cloudmusic',
    intentUri: 'intent://#Intent;package=com.netease.cloudmusic;end',
    searchIntentTemplate: 'intent://search?keyword={query}#Intent;package=com.netease.cloudmusic;scheme=orpheus;end',
    category: 'music',
  },
  {
    id: 'edge', name: 'Edge 浏览器', packageName: 'com.microsoft.emmx',
    intentUri: 'intent://#Intent;package=com.microsoft.emmx;end',
    category: 'browser',
  },
  {
    id: 'termux', name: 'Termux', packageName: 'com.termux',
    intentUri: 'intent://#Intent;package=com.termux;end',
    category: 'productivity',
  },
  {
    id: 'filemanager', name: '文件管理', packageName: 'com.android.documentsui',
    intentUri: 'intent://#Intent;package=com.android.documentsui;end',
    category: 'productivity',
  },
  {
    id: 'settings', name: '系统设置', packageName: 'com.android.settings',
    intentUri: 'intent://#Intent;package=com.android.settings;end',
    category: 'productivity',
  },
  {
    id: 'bilibili', name: '哔哩哔哩', packageName: 'tv.danmaku.bili',
    intentUri: 'intent://#Intent;package=tv.danmaku.bili;end',
    searchIntentTemplate: 'intent://search?keyword={query}#Intent;package=tv.danmaku.bili;scheme=bilibili;end',
    category: 'media',
  },
  {
    id: 'qqmusic', name: 'QQ音乐', packageName: 'com.tencent.qqmusic',
    intentUri: 'intent://#Intent;package=com.tencent.qqmusic;end',
    searchIntentTemplate: 'intent://search?query={query}#Intent;package=com.tencent.qqmusic;end',
    category: 'music',
  },
];

export function findApp(nameOrId: string): AppRegistryEntry | undefined {
  return APP_REGISTRY.find((a) =>
    a.id === nameOrId.toLowerCase() || a.name.includes(nameOrId) || a.packageName.includes(nameOrId)
  );
}

export function buildIntentUri(app: AppRegistryEntry, action: string, query?: string): string | null {
  switch (action) {
    case 'launch':
      return app.intentUri;
    case 'search':
      if (!app.searchIntentTemplate) return app.intentUri;
      return app.searchIntentTemplate.replace('{query}', encodeURIComponent(query || ''));
    case 'open_url':
      if (!query) return null;
      return query;
    default:
      return app.intentUri;
  }
}

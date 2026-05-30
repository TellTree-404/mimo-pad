export interface DeviceInfo {
  platform: string;
  osVersion: string;
  cpuCores: number;
  cpuModel: string;
  ramGB: number;
  gpuModel: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  storageTotal: number;
  storageFree: number;
  networkType: string;
}

const CPU_MODELS: Record<string, string> = {
  'SM8550': '骁龙 8 Gen 2',
  'SM8650': '骁龙 8 Gen 3',
  'SM8475': '骁龙 8+ Gen 1',
  'SM8450': '骁龙 8 Gen 1',
  'MediaTek': '联发科',
  'Tensor': 'Google Tensor',
  'Exynos': '三星 Exynos',
  'Apple': 'Apple Silicon',
};

function parseUA(): { platform: string; osVersion: string; cpuModel: string } {
  const ua = navigator.userAgent;
  const isAndroid = /Android\s([\d.]+)/.exec(ua);
  if (isAndroid) {
    const buildModel = /;?\s*([A-Za-z0-9\s-]+?)\s*(?:Build|MIUI|HyperOS)/.exec(ua);
    const model = buildModel?.[1]?.trim() || 'Android 设备';
    return { platform: `Android (${model})`, osVersion: `Android ${isAndroid[1]}`, cpuModel: model };
  }
  const isIOS = /iPhone OS\s([\d_]+)/.exec(ua);
  if (isIOS) return { platform: 'iOS', osVersion: `iOS ${isIOS[1]?.replace(/_/g, '.')}`, cpuModel: 'Apple' };
  return { platform: navigator.platform || '未知', osVersion: '未知', cpuModel: '未知' };
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const uaInfo = parseUA();
  const cpuCores = navigator.hardwareConcurrency || 4;
  const ramGB = (navigator as any).deviceMemory || 4;

  let gpuModel = '未知';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuModel = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '未知';
      }
    }
  } catch {}

  let storageTotal = 0, storageFree = 0;
  try {
    const estimate = await (navigator as any).storage?.estimate?.();
    if (estimate) {
      storageTotal = estimate.quota || 0;
      storageFree = estimate.quota - (estimate.usage || 0);
    }
  } catch {}

  let networkType = '未知';
  try {
    const conn = (navigator as any).connection;
    if (conn) networkType = conn.effectiveType || conn.type || 'WiFi';
  } catch {}

  return {
    platform: uaInfo.platform,
    osVersion: uaInfo.osVersion,
    cpuCores,
    cpuModel: uaInfo.cpuModel,
    ramGB,
    gpuModel: gpuModel.replace(/\(R\)|\(TM\)|Graphics/g, '').trim().replace(/\s+/g, ' '),
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: window.devicePixelRatio,
    storageTotal,
    storageFree,
    networkType,
  };
}

export function formatDeviceInfo(info: DeviceInfo): string {
  return [
    `## 设备信息`,
    `- 平台: ${info.platform}`,
    `- 系统: ${info.osVersion}`,
    `- CPU: ${info.cpuModel}, ${info.cpuCores} 核`,
    `- 内存: ${info.ramGB} GB`,
    `- GPU: ${info.gpuModel}`,
    `- 屏幕: ${info.screenWidth}×${info.screenHeight} @${info.pixelRatio}x`,
    `- 网络: ${info.networkType}`,
    info.storageTotal > 0 ? `- 存储: ${(info.storageFree / 1024 / 1024 / 1024).toFixed(0)}GB 可用 / ${(info.storageTotal / 1024 / 1024 / 1024).toFixed(0)}GB 总共` : '',
  ].filter(Boolean).join('\n');
}

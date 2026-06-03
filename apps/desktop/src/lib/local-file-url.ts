/** 通过 Electron local:// 协议安全加载已授权目录下的本地文件 */
export function localFileUrl(filePath: string): string {
  return `local://?path=${encodeURIComponent(filePath)}`;
}

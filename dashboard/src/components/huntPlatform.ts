export function isPolymarketPlatform(platform: string | undefined): boolean {
  return (platform || '').toLowerCase().includes('polymarket');
}

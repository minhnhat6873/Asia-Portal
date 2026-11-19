export const COVER_TABLE = [[0,0],[.031,.006],[.134,.012],[.206,.023],[.278,.047],[.34,.07],[.412,.105],[.485,.158],[.546,.246],[.583,.55],[.62,.825],[.69,.9],[.79,.94],[.85,.956],[.93,.975],[1,1]];
export const FACTORS: Record<string, number> = { word: .4, shadow: .3, bottle: .15, fruit: .55, corner: .75 };
export function cover(raw: number) {
  const t = Math.max(0, Math.min(1, raw));
  for (let i = 0; i < COVER_TABLE.length - 1; i++) {
    const [t0, c0] = COVER_TABLE[i], [t1, c1] = COVER_TABLE[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return c0 + (c1 - c0) * (3 * k * k - 2 * k * k * k);
    }
  }
  return 1;
}

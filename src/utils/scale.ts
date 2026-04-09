export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3.0;

export function fitScale(width: number, height: number): number {
  return Math.min(1.25, 760 / width, 640 / height);
}

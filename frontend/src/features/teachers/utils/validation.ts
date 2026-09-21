// utils/validation.ts
export const normalizeNumberArray = (input: unknown[]): number[] => {
  return input
    .map(item => {
      if (typeof item === 'number') return item;
      if (typeof item === 'string') {
        const num = parseInt(item, 10);
        return isNaN(num) ? null : num;
      }
      return null;
    })
    .filter((item): item is number => item !== null && item > 0);
};
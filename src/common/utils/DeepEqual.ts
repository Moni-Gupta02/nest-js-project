export const getDifferences = (
  before: any,
  current: any,
): { before_changes: any; current_changes: any } => {
  const before_changes = {};
  const current_changes = {};

  for (const key in before) {
    if (before.hasOwnProperty(key)) {
      if (Array.isArray(before[key]) && Array.isArray(current[key])) {
        if (!arraysEqual(before[key], current[key])) {
          before_changes[key] = before[key];
          current_changes[key] = current[key];
        }
      } else if (before[key] !== current[key]) {
        before_changes[key] = before[key];
        current_changes[key] = current[key];
      }
    }
  }

  return { before_changes, current_changes };
};

function arraysEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

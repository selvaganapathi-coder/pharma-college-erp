export function pick(fn: (value: string) => void) {
  return (value: string | null) => {
    if (value) fn(value);
  };
}

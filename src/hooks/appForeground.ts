type BrowserDocument = {
  visibilityState: string;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
};

export function subscribeToForeground(callback: () => void) {
  const browserDocument = (
    globalThis as typeof globalThis & {
      document?: BrowserDocument;
    }
  ).document;
  if (!browserDocument) return () => undefined;
  const handleVisibilityChange = () => {
    if (browserDocument.visibilityState === 'visible') callback();
  };
  browserDocument.addEventListener('visibilitychange', handleVisibilityChange);
  return () =>
    browserDocument.removeEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );
}

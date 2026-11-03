import { act, renderHook } from '@testing-library/react-native';
import type { ScrollView, View } from 'react-native';
import { useScrollDestination } from '../src/hooks/useScrollDestination';

let frames: Map<number, Parameters<typeof requestAnimationFrame>[0]>;
let nextFrame: number;
beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => {
    if (id != null) frames.delete(id);
  });
});
afterEach(() => jest.restoreAllMocks());
async function flush() {
  await act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  });
}
async function setup(
  ready = true,
  destination: string | undefined = 'saved-recipe',
) {
  const hook = await renderHook(
    ({ id, loaded }: { id: string | undefined; loaded: boolean }) =>
      useScrollDestination(id, loaded),
    { initialProps: { id: destination, loaded: ready } },
  );
  const scrollTo = jest.fn();
  const content = {} as View;
  let y = 1800;
  const measureLayout = jest.fn<
    void,
    [View, (x: number, y: number) => void, () => void]
  >((_relative, success) => success(0, y));
  hook.result.current.contentRef.current = content;
  hook.result.current.targetRef.current = { measureLayout } as unknown as View;
  hook.result.current.scrollRef.current = { scrollTo } as unknown as ScrollView;
  return {
    ...hook,
    scrollTo,
    measureLayout,
    content,
    setY: (value: number) => {
      y = value;
    },
  };
}
test('measures the exact recipe relative to content, without partial parent offsets', async () => {
  const h = await setup();
  h.result.current.onLayout();
  h.result.current.onLayout();
  await flush();
  expect(h.measureLayout).toHaveBeenCalledTimes(1);
  expect(h.measureLayout.mock.calls[0]![0]).toBe(h.content);
  expect(h.scrollTo).toHaveBeenCalledWith({ y: 1788, animated: false });
});
test('waits for initial ranking and then follows late card reflow until the user interacts', async () => {
  const h = await setup(false);
  await flush();
  expect(h.scrollTo).not.toHaveBeenCalled();
  await h.rerender({ id: 'saved-recipe', loaded: true });
  await flush();
  h.setY(2300);
  h.result.current.onLayout();
  await flush();
  expect(h.scrollTo).toHaveBeenLastCalledWith({ y: 2288, animated: false });
  h.result.current.cancel();
  h.setY(2600);
  h.result.current.onLayout();
  await flush();
  expect(h.scrollTo).toHaveBeenCalledTimes(2);
});
test('late native measurements cannot pull the user back after manual interaction', async () => {
  const h = await setup();
  let complete: (x: number, y: number) => void = () => {};
  h.measureLayout.mockImplementation((_relative, success) => {
    complete = success;
  });
  await flush();
  h.result.current.cancel();
  complete(0, 1900);
  expect(h.scrollTo).not.toHaveBeenCalled();
});
test('changing recipe resets focus and ignores an old destination response', async () => {
  const h = await setup();
  let old: (x: number, y: number) => void = () => {};
  h.measureLayout.mockImplementationOnce((_relative, success) => {
    old = success;
  });
  await flush();
  await h.rerender({ id: 'another-recipe', loaded: true });
  old(0, 999);
  expect(h.scrollTo).not.toHaveBeenCalled();
  h.setY(3100);
  await flush();
  expect(h.scrollTo).toHaveBeenLastCalledWith({ y: 3088, animated: false });
});
test('plain guide navigation does not jump to a recipe and failed measurements retry on layout', async () => {
  const h = await setup();
  await h.rerender({ id: undefined, loaded: true });
  await flush();
  expect(h.scrollTo).not.toHaveBeenCalled();
  await h.rerender({ id: 'recipe', loaded: true });
  h.measureLayout.mockImplementationOnce((_relative, _success, failure) =>
    failure(),
  );
  await flush();
  expect(h.scrollTo).not.toHaveBeenCalled();
  h.result.current.onLayout();
  await flush();
  expect(h.scrollTo).toHaveBeenCalledTimes(1);
});

test('out-of-order measurements from an earlier layout cannot replace the current card position', async () => {
  const h = await setup();
  const callbacks: ((x: number, y: number) => void)[] = [];
  h.measureLayout.mockImplementation((_relative, success) => {
    callbacks.push(success);
  });
  await flush();
  h.result.current.onLayout();
  await flush();
  callbacks[1]!(0, 2400);
  callbacks[0]!(0, 1000);
  expect(h.scrollTo).toHaveBeenCalledTimes(1);
  expect(h.scrollTo).toHaveBeenLastCalledWith({ y: 2388, animated: false });
});

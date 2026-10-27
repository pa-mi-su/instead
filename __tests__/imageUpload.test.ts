import { imageContentType } from '../src/lib/imageUpload';

test('detects phone photo bytes without relying on MIME labels or filenames', () => {
  expect(imageContentType(new Uint8Array([255, 216, 255, 224]).buffer)).toBe(
    'image/jpeg',
  );
  expect(
    imageContentType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer),
  ).toBe('image/png');
  expect(
    imageContentType(
      new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]).buffer,
    ),
  ).toBe('image/webp');
});

test('rejects empty or unconverted data instead of mislabeling uploads', () => {
  expect(() => imageContentType(new ArrayBuffer(0))).toThrow(
    'Could not convert',
  );
  expect(() =>
    imageContentType(new Uint8Array([71, 73, 70, 56]).buffer),
  ).toThrow('Could not convert');
});

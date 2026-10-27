/** Detect upload types from bytes: picker MIME labels vary across phones. */
export function imageContentType(
  bytes: ArrayBuffer,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  const data = new Uint8Array(bytes);
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => data[i] === value))
    return 'image/png';
  if (
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  throw new Error(
    'Could not convert this image. Please choose another photo or export it as JPEG, PNG, or WebP.',
  );
}

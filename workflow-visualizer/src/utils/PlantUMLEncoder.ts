/**
 * Browser-compatible PlantUML encoder
 * Uses proper DEFLATE compression like the original plantuml-encoder
 */

import * as pako from 'pako';

/**
 * Encode PlantUML code using proper DEFLATE compression
 * This matches the original plantuml-encoder behavior
 */
export function encodePlantUML(plantUMLCode: string): string {
  try {
    // Convert string to UTF-8 bytes
    const utf8Bytes = new TextEncoder().encode(plantUMLCode);

    // Compress using DEFLATE
    const compressed = pako.deflateRaw(utf8Bytes, { level: 9 });

    // Convert to PlantUML's custom base64-like encoding
    return encode64(compressed);
  } catch (error) {
    console.error('Failed to encode PlantUML with DEFLATE:', error);
    throw new Error('PlantUML DEFLATE encoding failed');
  }
}

/**
 * PlantUML's custom base64-like encoding
 * Based on the original plantuml-encoder implementation
 */
function encode64(data: Uint8Array): string {
  let r = '';
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(data[i], 0, 0);
    } else {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }
  return r;
}

/**
 * Helper function for PlantUML's custom encoding
 */
function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  let r = '';
  r += encode6bit(c1 & 0x3f);
  r += encode6bit(c2 & 0x3f);
  r += encode6bit(c3 & 0x3f);
  r += encode6bit(c4 & 0x3f);
  return r;
}

/**
 * PlantUML's custom 6-bit encoding
 */
function encode6bit(b: number): string {
  if (b < 10) {
    return String.fromCharCode(48 + b);
  }
  b -= 10;
  if (b < 26) {
    return String.fromCharCode(65 + b);
  }
  b -= 26;
  if (b < 26) {
    return String.fromCharCode(97 + b);
  }
  b -= 26;
  if (b === 0) {
    return '-';
  }
  if (b === 1) {
    return '_';
  }
  return '?';
}

/**
 * Fallback encoder using base64 with ~1 header
 * Use this if DEFLATE encoding fails
 */
export function encodePlantUMLFallback(plantUMLCode: string): string {
  try {
    // Convert to UTF-8 bytes then to base64
    const utf8String = unescape(encodeURIComponent(plantUMLCode));
    const base64 = btoa(utf8String);

    // Add ~1 header for PlantUML
    return '~1' + base64;
  } catch (error) {
    console.error('Failed to encode PlantUML (fallback):', error);
    throw new Error('PlantUML fallback encoding failed');
  }
}

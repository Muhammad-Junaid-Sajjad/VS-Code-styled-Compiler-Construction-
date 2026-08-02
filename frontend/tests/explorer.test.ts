/** T041 / FR-041 — sample catalog mapping and language flip. */
import { describe, it, expect } from 'vitest';
import { SAMPLES, sampleById } from '../src/samples/catalog';
import { useStore } from '../src/state/store';

describe('explorer / catalog (T041 / FR-041)', () => {
  it('maps .c samples to c and .py samples to python', () => {
    expect(sampleById('hello')?.language).toBe('c');
    expect(sampleById('test')?.language).toBe('c');
    expect(sampleById('py-hello')?.language).toBe('python');
    expect(sampleById('py-func')?.language).toBe('python');
  });

  it('every catalog sample is non-empty', () => {
    for (const s of SAMPLES) expect(s.code.trim().length).toBeGreaterThan(0);
  });

  it('loading a .py sample flips the language selector', () => {
    const s = sampleById('py-hello')!;
    useStore.getState().setLanguage(s.language);
    useStore.getState().setCurrentFile(s.name);
    expect(useStore.getState().language).toBe('python');
    expect(useStore.getState().currentFile).toBe('hello.py');
  });
});

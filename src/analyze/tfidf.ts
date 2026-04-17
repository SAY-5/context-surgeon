// Minimal TF-IDF over character n-grams (3-5). Smoothed idf = log((N+1)/(df+1)) + 1
// so single-document corpora don't collapse to zero. Good enough for finding
// substantially-similar paragraphs in a CLAUDE.md corpus — not a search engine.

export class TfIdfIndex {
  private readonly docs: Array<Map<string, number>> = [];
  private readonly df = new Map<string, number>();

  add(text: string): number {
    const tf = new Map<string, number>();
    for (const g of nGrams(text, 3, 5)) {
      tf.set(g, (tf.get(g) ?? 0) + 1);
    }
    for (const g of tf.keys()) {
      this.df.set(g, (this.df.get(g) ?? 0) + 1);
    }
    this.docs.push(tf);
    return this.docs.length - 1;
  }

  get length(): number {
    return this.docs.length;
  }

  private vector(i: number): Map<string, number> {
    const tf = this.docs[i]!;
    const n = this.docs.length;
    const vec = new Map<string, number>();
    for (const [g, f] of tf) {
      const idf = Math.log((n + 1) / ((this.df.get(g) ?? 0) + 1)) + 1;
      vec.set(g, f * idf);
    }
    return vec;
  }

  cosine(i: number, j: number): number {
    if (i === j) return 1;
    const a = this.vector(i);
    const b = this.vector(j);
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    for (const [k, v] of a) {
      aMag += v * v;
      const bv = b.get(k);
      if (bv !== undefined) dot += v * bv;
    }
    for (const v of b.values()) bMag += v * v;
    if (aMag === 0 || bMag === 0) return 0;
    return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
  }
}

function* nGrams(raw: string, min: number, max: number): Iterable<string> {
  const s = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let n = min; n <= max; n++) {
    for (let i = 0; i + n <= s.length; i++) {
      yield s.slice(i, i + n);
    }
  }
}

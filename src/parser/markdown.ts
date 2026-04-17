export interface Paragraph {
  text: string;
  lineStart: number;
  lineEnd: number;
}

export function splitParagraphs(body: string): Paragraph[] {
  const lines = body.split('\n');
  const paras: Paragraph[] = [];
  let buffer: string[] = [];
  let bufStart = 0;
  let inFence = false;

  const flush = (endLine: number) => {
    const text = buffer.join('\n').trim();
    if (text.length > 0) {
      paras.push({ text, lineStart: bufStart, lineEnd: endLine });
    }
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isFenceToggle = /^```/.test(line.trimStart());
    if (isFenceToggle) inFence = !inFence;

    if (!inFence && line.trim() === '') {
      flush(i - 1);
      bufStart = i + 1;
    } else {
      if (buffer.length === 0) bufStart = i;
      buffer.push(line);
    }
  }
  flush(lines.length - 1);
  return paras;
}

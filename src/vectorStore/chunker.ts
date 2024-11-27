import { CodeChunk, FileContent } from '../types.js';

export class CodeChunker {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      // Get chunk of specified size
      const chunk = text.slice(startIndex, startIndex + this.chunkSize);
      chunks.push(chunk);

      // Move start index forward by chunk size minus overlap
      startIndex += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  private detectChunkType(content: string): 'code' | 'documentation' | 'comment' {
    // Simple heuristic - can be improved
    if (content.trim().startsWith('/**') || content.trim().startsWith('/*')) {
      return 'documentation';
    }
    if (content.trim().startsWith('//')) {
      return 'comment';
    }
    return 'code';
  }

  chunkCode(file: FileContent, module?: string): CodeChunk[] {
    const chunks = this.splitIntoChunks(file.content);
    let currentLine = 1;

    return chunks.map((content, index) => {
      const lines = content.split('\n');
      const startLine = currentLine;
      const endLine = currentLine + lines.length - 1;
      currentLine += lines.length - (index < chunks.length - 1 ? this.chunkOverlap / 40 : 0); // Approximate lines in overlap

      return {
        content,
        metadata: {
          path: file.path,
          type: this.detectChunkType(content),
          module,
          startLine,
          endLine
        }
      };
    });
  }

  chunkDocumentation(content: string, path: string): CodeChunk[] {
    const chunks = this.splitIntoChunks(content);

    return chunks.map(chunk => ({
      content: chunk,
      metadata: {
        path,
        type: 'documentation',
        section: this.detectSection(chunk)
      }
    }));
  }

  private detectSection(content: string): string {
    // Try to detect section from headers
    const headerMatch = content.match(/^#+\s+(.+)$/m);
    if (headerMatch) {
      return headerMatch[1].trim();
    }
    return 'General';
  }
}

export const createChunker = (chunkSize?: number, chunkOverlap?: number): CodeChunker => {
  return new CodeChunker(chunkSize, chunkOverlap);
};

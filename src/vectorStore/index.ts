import { CodeChunk, SearchResult, VectorStoreConfig } from '../types.js';
import path from 'path';
import fs from 'fs/promises';

interface VectorDocument {
  id: string;
  content: string;
  metadata: any;
  embedding: number[];
}

interface StoredData {
  documents: VectorDocument[];
  timestamp: string;
  config: VectorStoreConfig;
}

export class VectorStore {
  private documents: VectorDocument[] = [];
  private encoder: any;
  private config: VectorStoreConfig;
  private storePath: string;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.storePath = path.join(process.cwd(), 'project-docs', 'vector-store.json');
  }

  async initialize(): Promise<void> {
    try {
      const { pipeline } = await import('@xenova/transformers');
      this.encoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      // Try to load existing data
      try {
        const data = await fs.readFile(this.storePath, 'utf-8');
        const stored: StoredData = JSON.parse(data);
        this.documents = stored.documents;
        console.log(`Loaded ${this.documents.length} existing documents from store`);
      } catch (error) {
        console.log('No existing vector store found, starting fresh');
      }
      
      console.log('Vector store initialized successfully');
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const output = await this.encoder(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }

  private async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async addChunks(chunks: CodeChunk[]): Promise<void> {
    try {
      console.log(`Processing ${chunks.length} chunks...`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk.content);
        
        this.documents.push({
          id: `chunk_${i}`,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding
        });

        if ((i + 1) % 10 === 0) {
          console.log(`Processed ${i + 1}/${chunks.length} chunks`);
        }
      }

      // Save to disk
      await this.save();

      console.log(`Added ${chunks.length} chunks to vector store`);
    } catch (error) {
      console.error('Error adding chunks:', error);
      throw error;
    }
  }

  private async save(): Promise<void> {
    const storeDir = path.dirname(this.storePath);
    await fs.mkdir(storeDir, { recursive: true });
    
    const data: StoredData = {
      documents: this.documents,
      timestamp: new Date().toISOString(),
      config: this.config
    };
    
    await fs.writeFile(this.storePath, JSON.stringify(data, null, 2));
  }

  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      if (this.documents.length === 0) {
        return [];
      }

      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await Promise.all(
        this.documents.map(async doc => ({
          doc,
          similarity: await this.cosineSimilarity(queryEmbedding, doc.embedding)
        }))
      );

      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(result => ({
          content: result.doc.content,
          metadata: result.doc.metadata,
          similarity: result.similarity
        }));
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    this.documents = [];
    try {
      await fs.unlink(this.storePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
}

export const createVectorStore = async (config: VectorStoreConfig): Promise<VectorStore> => {
  const store = new VectorStore(config);
  await store.initialize();
  return store;
};

export const getDefaultConfig = (): VectorStoreConfig => ({
  collectionName: 'devdocbot_code',
  dimension: 384, // Dimension of all-MiniLM-L6-v2 embeddings
  chunkSize: 1000,
  chunkOverlap: 200
});

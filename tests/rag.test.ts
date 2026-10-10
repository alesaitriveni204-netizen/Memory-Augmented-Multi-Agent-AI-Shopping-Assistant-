import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRagDocuments,
  chunkText,
  createMemoryEmbeddingProvider,
  createInMemoryVectorStore,
  createRagQuery,
} from '../src/backend/rag/index.ts';

test('buildRagDocuments converts product data into semantic chunks', async () => {
  const docs = buildRagDocuments([
    {
      id: 'p1',
      name: 'Galaxy A54',
      brand: 'Samsung',
      category: 'phone',
      subcategory: 'Android phone',
      specs: JSON.stringify({ ram: '8GB', battery: '5000mAh', camera: '50MP' }),
      basePrice: 29000,
      rating: 4.5,
      reviewCount: 300,
      pros: JSON.stringify(['Good camera', 'Clean UI']),
      cons: JSON.stringify(['Average charging']),
      tags: JSON.stringify(['camera', 'budget']),
      sentimentScore: 0.8,
      imageColor: '#000000',
      platformPrices: [
        { platform: 'amazon', price: 28999, mrp: 34999, discount: 17, deliveryDays: 3, inStock: true },
      ],
      priceHistory: [],
    },
  ] as any);

  assert.ok(docs.length > 0);
  assert.ok(docs.some((doc) => doc.content.toLowerCase().includes('samsung')));
  assert.ok(docs.some((doc) => doc.sourceType === 'product'));
});

test('chunkText produces deterministic chunks with metadata', () => {
  const chunks = chunkText('A '.repeat(500), {
    chunkSize: 120,
    overlap: 20,
    sourceType: 'product',
    documentType: 'product_overview',
    metadata: { brand: 'Samsung' },
  });

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.content.length > 0));
  assert.equal(chunks[0].metadata.brand, 'Samsung');
  assert.ok(chunks[0].chunkId.length > 0);
});

test('in-memory vector search returns relevant document', async () => {
  const provider = createMemoryEmbeddingProvider();
  const store = createInMemoryVectorStore(provider);

  const docs = [
    {
      id: 'chunk-1',
      content: 'Samsung phone with strong camera and good battery life',
      sourceType: 'product',
      documentType: 'product_overview',
      metadata: { brand: 'Samsung', category: 'phone' },
      userId: undefined,
      productId: 'p1',
    },
    {
      id: 'chunk-2',
      content: 'Budget laptop with 16GB RAM and fast SSD',
      sourceType: 'product',
      documentType: 'product_overview',
      metadata: { brand: 'Dell', category: 'laptop' },
      userId: undefined,
      productId: 'p2',
    },
  ];

  await store.upsert(docs as any);
  const results = await store.search(await provider.embedText('best samsung camera phone'), { limit: 3 });

  assert.ok(results.length > 0);
  assert.equal(results[0].metadata.category, 'phone');
  assert.ok(results[0].score >= 0);
});

test('createRagQuery normalizes user request fields', () => {
  const query = createRagQuery({
    userId: 'user-1',
    query: 'Find a Samsung phone under ₹30000',
    category: 'phone',
    brand: 'Samsung',
    topK: 4,
  });

  assert.equal(query.userId, 'user-1');
  assert.equal(query.category, 'phone');
  assert.equal(query.brand, 'Samsung');
  assert.equal(query.topK, 4);
});

import { buildBatchProcessing } from './buildBatchProcessing';

describe('buildBatchProcessing', () => {
  const processCallback = jest.fn();
  beforeEach(() => {
    processCallback.mockReset();
    processCallback.mockImplementation((_entity) => Promise.resolve());
  });

  it('should batch entities correctly and process them in batches', async () => {
    const { withBatchProcessing, flushBatch } = buildBatchProcessing({
      processCallback,
      batchSize: 2,
      concurrency: 1,
    });

    await withBatchProcessing('entity1');
    await withBatchProcessing('entity2');
    expect(processCallback).not.toHaveBeenCalled(); // Not processed yet, waiting for the batch to fill

    await withBatchProcessing('entity3'); // This should trigger processing of the first batch ('entity1', 'entity2')
    expect(processCallback).toHaveBeenCalledTimes(3); // First batch processed

    await flushBatch(); // This should not have anything left to process.
    expect(processCallback).toHaveBeenCalledTimes(3);
  });

  it('should flush remaining entities correctly', async () => {
    const { withBatchProcessing, flushBatch } = buildBatchProcessing({
      processCallback,
      batchSize: 5, // Larger than the number of entities to ensure flushBatch is needed
      concurrency: 1,
    });

    await withBatchProcessing('entity1');
    await withBatchProcessing('entity2');

    expect(processCallback).not.toHaveBeenCalled(); // Ensure no premature processing

    await flushBatch(); // Should process both entities
    expect(processCallback).toHaveBeenCalledTimes(2);
  });
});

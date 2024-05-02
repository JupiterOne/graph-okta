import {
  IntegrationError,
  IntegrationLogger,
} from '@jupiterone/integration-sdk-core';
import Bottleneck from 'bottleneck';
import { QueueTasksState } from '../types/queue';

const FIVE_MINUTES = 5 * 60 * 1_000;

/**
 * Executes a function with managed concurrency using a rate-limiting strategy.
 * This function sets up a `Bottleneck` limiter to control task execution, allowing
 * tasks to be spread evenly over a defined time period while maintaining a max concurrency.
 *
 * @param {Object} options - Configuration options for concurrency control.
 * @param {number} options.maxConcurrent - The maximum number of concurrent tasks.
 * @param {IntegrationLogger} [options.logger] - Optional logger for internal state and errors.
 * @param {string} [options.logPrefix] - Optional prefix for log messages.
 * @param {boolean} [options.logQueueState] - Set to true to enable periodic logging of the queue state.
 * @param {Function} [options.onFailed] - A function that takes an error object and returns a boolean indicating
 *                                        whether the error should be ignored. Returning true ignores the error.
 * @param {Function} fn - The function to execute that handles task execution.
 *                        This function receives three arguments:
 *                          - limiter (Bottleneck): A Bottleneck instance for managing concurrency.
 *                          - tasksState (QueueTasksState): An object to track errors and rate limiting status.
 *                          - waitForTasksCompletion (() => Promise<void>): A function to call to wait for all tasks to complete.
 * @returns {Promise<void>} A promise that resolves when all tasks have been completed or rejects if an error occurs.
 *
 * @example
 * withConcurrentQueue({
 *   maxConcurrent: 5,
 *   logger: console,
 *   logPrefix: 'TaskQueue',
 *   logQueueState: true,
 *   onFailed: err => {
 *     console.error('Failed task detected:', err);
 *     return false; // Do not ignore the error
 *   }
 * }, async (limiter, tasksState, waitForCompletion) => {
 *   for (let i = 0; i < 10; i++) {
 *     limiter.schedule(() => someAsyncTask(i));
 *   }
 *   await waitForCompletion();
 * }).then(() => {
 *   console.log('All tasks completed successfully.');
 * }).catch(error => {
 *   console.error('Error in executing tasks:', error);
 * });
 */
export async function withConcurrentQueue(
  options: {
    maxConcurrent: number;
    logger?: IntegrationLogger;
    logPrefix?: string;
    logQueueState?: boolean;
    onFailed?: (err: any) => boolean;
  },
  fn: (
    limiter: Bottleneck,
    tasksState: QueueTasksState,
    waitForTasksCompletion: () => Promise<void>,
  ) => Promise<void>,
): Promise<void> {
  const ONE_MINUTE_IN_MS = 60_000;
  const { maxConcurrent } = options;
  const limiter = new Bottleneck({
    maxConcurrent,
    minTime: Math.floor(ONE_MINUTE_IN_MS / maxConcurrent), // space requests evenly over 1 minute.
    reservoir: maxConcurrent,
    reservoirRefreshAmount: maxConcurrent,
    reservoirRefreshInterval: ONE_MINUTE_IN_MS, // refresh every minute.
  });

  const resetLimiter = () => {
    limiter.updateSettings({
      reservoir: null,
      maxConcurrent: null,
      minTime: 0,
      reservoirRefreshAmount: null,
      reservoirRefreshInterval: null,
    });
  };

  const tasksState: QueueTasksState = {
    error: undefined,
    rateLimitReached: false,
  };

  limiter.on('failed', (err) => {
    let ignoreError = false;
    if (options.onFailed) {
      ignoreError = options.onFailed(err);
    }
    if (ignoreError) {
      return;
    }
    if (!tasksState.error) {
      tasksState.error = err;
      // After the first error, reset the limiter to allow all remaining tasks to finish immediately.
      resetLimiter();
    }
  });

  let resolveIdlePromise: () => void | undefined;
  limiter.on('idle', () => {
    resolveIdlePromise?.();
  });
  const waitForTasksCompletion = () => {
    return new Promise<void>((resolve) => {
      resolveIdlePromise = resolve;
    });
  };

  let lastStateChangeTime = Date.now();
  const states = ['received', 'queued', 'scheduled', 'executing', 'done'];
  for (const state of states) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    limiter.on(state, () => {
      lastStateChangeTime = Date.now();
    });
  }
  const limiterIntervalId = setInterval(() => {
    const queueState = JSON.stringify(limiter.counts());
    if (options.logQueueState) {
      options.logger?.info(
        `${options.logPrefix ? `${options.logPrefix} ` : ''}${queueState}`,
      );
    }
    if (Date.now() - lastStateChangeTime >= FIVE_MINUTES) {
      options.logger?.error(
        { queueState },
        'Queue has been in the same state for more than 5 minutes.',
      );
      tasksState.error = new IntegrationError({
        code: 'QUEUE_STATE_CHANGE_TIMEOUT',
        message: `Queue has been in the same state for more than 5 minutes.`,
      });
      resetLimiter();
      resolveIdlePromise?.();
    }
  }, FIVE_MINUTES);

  try {
    await fn(limiter, tasksState, async () => {
      await waitForTasksCompletion();
      // Check if any of the tasks has failed with an unrecoverable error
      // If so, throw the error to stop the execution.
      if (tasksState.error) {
        throw tasksState.error;
      }
    });
  } finally {
    clearInterval(limiterIntervalId);
    limiter.removeAllListeners();
  }
}

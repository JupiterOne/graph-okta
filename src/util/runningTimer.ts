import {
  IntegrationInfoEventName,
  IntegrationLogger,
} from '@jupiterone/integration-sdk-core';

class StepAnnouncer {
  private stepId: string;
  private announceEvery: number;
  private intervalId: NodeJS.Timeout | null = null;
  private logger: IntegrationLogger;
  private startedAt: Date;

  constructor(
    stepId: string,
    announceEvery: number,
    logger: IntegrationLogger,
  ) {
    this.stepId = stepId;
    this.announceEvery = announceEvery * 1000; // Keep milliseconds for JS timers
    this.logger = logger;
    this.startedAt = new Date();
    this.start(); // Consider starting outside of the constructor for more control
  }

  private getReadableHumanTime(): string {
    const elapsedSeconds = Math.floor(
      (new Date().getTime() - this.startedAt.getTime()) / 1000,
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const remainingSeconds = elapsedSeconds % 60;
    let message =
      minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : '';
    if (remainingSeconds > 0) {
      message += message
        ? ` ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`
        : `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
    }
    return message || '0 seconds';
  }

  public start(): void {
    if (this.intervalId === null) {
      this.intervalId = setInterval(() => this.announce(), this.announceEvery);
      this.logger.publishInfoEvent({
        description: `[${this.stepId}] has started.`,
        name: IntegrationInfoEventName.Stats,
      });
    }
  }

  private announce(): void {
    const timeMessage = this.getReadableHumanTime();
    this.logger.publishInfoEvent({
      description: `[${this.stepId}] has been running for ${timeMessage}.`,
      name: IntegrationInfoEventName.Stats,
    });
  }

  public finish(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.publishInfoEvent({
        description: `[${this.stepId}] has finished after ${this.getReadableHumanTime()}.`,
        name: IntegrationInfoEventName.Stats,
      });
    }
  }
}

export { StepAnnouncer };

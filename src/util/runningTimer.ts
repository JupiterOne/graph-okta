import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

class StepAnnouncer {
  private stepId: string;
  private announceEvery: number;
  private intervalId: NodeJS.Timeout | null = null;
  private logger: IntegrationLogger;
  private startedAt: Date;

  constructor(
    stepId: string,
    logger: IntegrationLogger,
    announceEvery: number = 45,
  ) {
    this.stepId = stepId;
    this.announceEvery = announceEvery * 1000;
    this.logger = logger;
    this.startedAt = new Date();
    this.start();
  }

  private getReadableHumanTime(): string {
    const elapsedSeconds = Math.floor(
      (new Date().getTime() - this.startedAt.getTime()) / 1000,
    );
    const hours = Math.floor(elapsedSeconds / 3600);
    const remainingMinutes = Math.floor((elapsedSeconds % 3600) / 60);
    const remainingSeconds = elapsedSeconds % 60;

    const messageParts: string[] = [];

    if (hours > 0) {
      messageParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (remainingMinutes > 0) {
      messageParts.push(
        `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
      );
    }
    if (remainingSeconds > 0 || messageParts.length === 0) {
      messageParts.push(
        `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`,
      );
    }

    return messageParts.join(' ');
  }

  public start(): void {
    if (this.intervalId === null) {
      this.intervalId = setInterval(() => this.announce(), this.announceEvery);
      this.logger.info(`[${this.stepId}] has started.`);
    }
  }

  private announce(): void {
    const timeMessage = this.getReadableHumanTime();
    const description = `[${this.stepId}] has been running for ${timeMessage}.`;
    this.logger.info(description);
  }

  public finish(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      const description = `[${this.stepId}] has finished after ${this.getReadableHumanTime()}.`;
      this.logger.info(description);
    }
  }
}

export { StepAnnouncer };

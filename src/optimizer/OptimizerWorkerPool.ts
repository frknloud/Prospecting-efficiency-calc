import { createOptimizerWorker } from "./createOptimizerWorker";

import { getRecommendedWorkerPoolSize } from "./getRecommendedWorkerPoolSize";

export class OptimizerWorkerPool {
  private available: Worker[] = [];

  private busy: Set<Worker> = new Set();

  private readonly maxWorkers = getRecommendedWorkerPoolSize();

  private getTotalWorkers(): number {
    return this.available.length + this.busy.size;
  }

  acquire(): Worker {
    const existingWorker = this.available.pop();

    if (existingWorker !== undefined) {
      this.busy.add(existingWorker);

      return existingWorker;
    }

    if (this.getTotalWorkers() < this.maxWorkers) {
      const newWorker = createOptimizerWorker();

      this.busy.add(newWorker);

      return newWorker;
    }

    const fallbackWorker = createOptimizerWorker();

    this.busy.add(fallbackWorker);

    return fallbackWorker;
  }

  release(worker: Worker): void {
    if (!this.busy.has(worker)) {
      return;
    }

    this.busy.delete(worker);

    this.available.push(worker);
  }

  destroy(): void {
    for (const worker of this.available) {
      worker.terminate();
    }

    for (const worker of this.busy) {
      worker.terminate();
    }

    this.available = [];

    this.busy.clear();
  }
}

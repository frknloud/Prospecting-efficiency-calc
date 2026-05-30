import { OptimizerTask } from "./types";

import { BuildState } from "../engine/types";

import { OptimizerSession } from "./types";

import { updateSessionProgress } from "./updateSessionProgress";

import { dispatchOptimizerWorkerTask } from "./dispatchOptimizerWorkerTask";

export async function executeOptimizerTask(
  task: OptimizerTask,
  session: OptimizerSession,
  build: BuildState,
  ringSlotLimit: number,
): Promise<OptimizerTask> {
  task.status = "running";

  if (task.cancelRequested) {
    task.status = "cancelled";

    task.completedAt = Date.now();

    return task;
  }

  try {
    task.onProgress = (results, progress) => {
      updateSessionProgress(session, progress, results);
    };

    const workerResponse = await dispatchOptimizerWorkerTask(
      task,
      build,
      ringSlotLimit,

      (response) => {
        if (response.progress) {
          updateSessionProgress(
            session,

            response.progress,

            response.results,
          );
        }
      },
    );

    if (workerResponse.error) {
      throw new Error(workerResponse.error);
    }

    const results = workerResponse.results;

    task.results = results;

    task.status = "completed";

    task.completedAt = Date.now();

    return task;
  } catch (error) {
    task.status = "failed";

    task.completedAt = Date.now();

    task.error = error instanceof Error ? error.message : String(error);

    return task;
  }
}

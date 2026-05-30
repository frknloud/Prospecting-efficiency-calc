import { OptimizerTask } from "./types";

export function cancelOptimizerTask(task: OptimizerTask): void {
  task.cancelRequested = true;

  task.worker?.postMessage({
    type: "cancel",

    taskId: task.id,
  });
}

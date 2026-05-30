import { OptimizerSession, OptimizerTask } from "./types";

export function addTaskToSession(
  session: OptimizerSession,
  task: OptimizerTask,
): void {
  session.tasks.push(task);

  session.updatedAt = Date.now();
}

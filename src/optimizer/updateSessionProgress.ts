import { OptimizerProgress, OptimizerResult, OptimizerSession } from "./types";

import { isProgressSnapshotDuplicate } from "./isProgressSnapshotDuplicate";

import { MAX_REPLAY_HISTORY, REPLAY_DECIMATION_INTERVAL } from "./replayConfig";

const MIN_SNAPSHOT_INTERVAL = 250;

export function updateSessionProgress(
  session: OptimizerSession,

  progress: OptimizerProgress,

  results: OptimizerResult[],
): void {
  session.latestProgress = progress;

  session.latestResults = [...results];

  session.stats.totalExploredBuilds = Math.max(
    session.stats.totalExploredBuilds,

    progress.exploredBuilds,
  );

  session.stats.totalDuplicateBuildSkips = Math.max(
    session.stats.totalDuplicateBuildSkips,

    progress.duplicateBuildSkips,
  );

  session.stats.totalDuplicateResultSkips = Math.max(
    session.stats.totalDuplicateResultSkips,

    progress.duplicateResultSkips,
  );

  session.stats.maxFrontierSize = Math.max(
    session.stats.maxFrontierSize,

    progress.largestFrontierSize,
  );

  session.stats.deepestDepthReached = Math.max(
    session.stats.deepestDepthReached,

    progress.currentDepth,
  );

  session.stats.bestResultCount = Math.max(
    session.stats.bestResultCount,

    progress.resultCount,
  );

  const latestSnapshot = session.history[session.history.length - 1];

  const now = Date.now();

  if (latestSnapshot) {
    const duplicate = isProgressSnapshotDuplicate(
      latestSnapshot.progress,
      progress,
    );

    const tooSoon = now - latestSnapshot.timestamp < MIN_SNAPSHOT_INTERVAL;

    if (duplicate || tooSoon) {
      return;
    }
  }

  const sequence = session.history.length;

  const elapsedMs = now - session.createdAt;

  session.history.push({
    timestamp: now,

    sequence,

    elapsedMs,

    progress,

    results: [...results],
  });

  session.stats.totalSnapshots++;

  if (session.history.length > MAX_REPLAY_HISTORY) {
    session.history = session.history.filter((snapshot, index) => {
      if (index === session.history.length - 1) {
        return true;
      }

      return index % REPLAY_DECIMATION_INTERVAL === 0;
    });
  }

  session.updatedAt = Date.now();
}

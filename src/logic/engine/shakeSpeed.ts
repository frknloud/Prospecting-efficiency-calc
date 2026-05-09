import {
  MAX_SHAKE
} from './constants';

import {
  SHAKE_SPEED_POINTS
} from './shakePoints';

function linearInterpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x2 === x1) {
    return y1;
  }

  return (
    y1 +
    ((x - x1) / (x2 - x1)) *
      (y2 - y1)
  );
}

export function shakeSpeedToR(
  shakeSpeed: number
): number {
  let x = Math.max(
    0,
    Math.min(shakeSpeed, MAX_SHAKE)
  );

  const [firstX, firstY] =
    SHAKE_SPEED_POINTS[0];

  if (x <= firstX) {
    const [secondX, secondY] =
      SHAKE_SPEED_POINTS[1];

    return Math.max(
      0,
      linearInterpolate(
        x,
        firstX,
        firstY,
        secondX,
        secondY
      )
    );
  }

  for (let i = 0; i < SHAKE_SPEED_POINTS.length - 1; i++) {
    const [x1, y1] =
      SHAKE_SPEED_POINTS[i];

    const [x2, y2] =
      SHAKE_SPEED_POINTS[i + 1];

    if (x <= x2) {
      return Math.max(
        0,
        linearInterpolate(
          x,
          x1,
          y1,
          x2,
          y2
        )
      );
    }
  }

  const [last2X, last2Y] =
    SHAKE_SPEED_POINTS[
      SHAKE_SPEED_POINTS.length - 2
    ];

  const [lastX, lastY] =
    SHAKE_SPEED_POINTS[
      SHAKE_SPEED_POINTS.length - 1
    ];

  return Math.max(
    0,
    linearInterpolate(
      x,
      last2X,
      last2Y,
      lastX,
      lastY
    )
  );
}


import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

/**
 * 独立的倒计时组件
 * 将倒计时逻辑隔离，避免父组件重渲染
 */
const CountdownTimer = React.memo(({ votingEndTime, formatTime, ...textProps }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (votingEndTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, votingEndTime - Date.now());
        setTimeRemaining(remaining);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(0);
    }
  }, [votingEndTime]);

  return (
    <Typography {...textProps}>
      {formatTime(timeRemaining)}
    </Typography>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;


import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const compact = width < 380 || height < 720;
    const medium = width >= 380 && width < 768;
    const tablet = width >= 768;
    const contentPadding = tablet ? 24 : compact ? 12 : 16;
    const sectionGap = compact ? 12 : 16;
    const iconButtonSize = compact ? 40 : 44;
    const inputHeight = compact ? 48 : 52;
    const buttonHeight = compact ? 48 : 52;
    const compactButtonHeight = compact ? 36 : 38;
    const maxContentWidth = tablet ? 760 : undefined;
    const chartWidth = Math.max(Math.min(width - contentPadding * 2 - 32, 720), 240);

    return {
      width,
      height,
      compact,
      medium,
      tablet,
      contentPadding,
      sectionGap,
      iconButtonSize,
      inputHeight,
      buttonHeight,
      compactButtonHeight,
      maxContentWidth,
      chartWidth,
    };
  }, [width, height]);
}

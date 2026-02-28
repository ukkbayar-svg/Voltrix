import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
}

export default function LineChart({
  data,
  width: propWidth,
  height = 300,
  color = Colors.neonGreen,
  showGrid = true,
  showLabels = true,
}: LineChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const width = propWidth || screenWidth - 32;

  const chartData = useMemo(() => {
    if (data.length < 2) return null;

    const padding = { top: 20, right: showLabels ? 55 : 10, bottom: 20, left: 10 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
      .map((value, index) => {
        const x = padding.left + (index / (data.length - 1)) * plotWidth;
        const y = padding.top + plotHeight - ((value - min) / range) * plotHeight;
        return `${x},${y}`;
      })
      .join(' ');

    // Area fill path
    const firstX = padding.left;
    const lastX = padding.left + plotWidth;
    const bottomY = padding.top + plotHeight;
    const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

    // Grid lines
    const gridCount = 5;
    const gridLines = Array.from({ length: gridCount }, (_, i) => {
      const value = min + (range * i) / (gridCount - 1);
      const y = padding.top + plotHeight - ((value - min) / range) * plotHeight;
      return { value, y };
    });

    return { points, areaPoints, gridLines, padding, plotWidth, plotHeight };
  }, [data, width, height, showLabels]);

  if (!chartData) return null;

  const gradId = 'lineGrad';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid */}
        {showGrid &&
          chartData.gridLines.map((line, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={chartData.padding.left}
                y1={line.y}
                x2={chartData.padding.left + chartData.plotWidth}
                y2={line.y}
                stroke={Colors.chartGrid}
                strokeWidth={1}
              />
              {showLabels && (
                <SvgText
                  x={chartData.padding.left + chartData.plotWidth + 5}
                  y={line.y + 4}
                  fill={Colors.textTertiary}
                  fontSize={9}
                  fontFamily={Fonts.mono}
                >
                  {line.value.toFixed(line.value > 100 ? 1 : 4)}
                </SvgText>
              )}
            </G>
          ))}

        {/* Area fill */}
        <Polyline points={chartData.areaPoints} fill={`url(#${gradId})`} stroke="none" />

        {/* Line */}
        <Polyline
          points={chartData.points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

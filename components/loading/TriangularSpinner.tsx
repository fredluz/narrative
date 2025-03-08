import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export const TriangularSpinner = ({ size = 24, color = "#BBB" }: Props) => {
  // Define the fixed positions of the triangle in clockwise order
  const positions = [
    { x: 50, y: 30 }, // Top (index 0)
    { x: 70, y: 70 }, // Bottom Right (index 1)
    { x: 30, y: 70 }, // Bottom Left (index 2)
  ];

  // Calculate the center point (centroid of the triangle)
  const center = {
    x: (positions[0].x + positions[1].x + positions[2].x) / 3, // 50
    y: (positions[0].y + positions[1].y + positions[2].y) / 3, // ~56.67
  };

  // State to track the current position indices and animation progress
  const [currentIndices, setCurrentIndices] = useState([0, 1, 2]);
  const [progress, setProgress] = useState(0);

  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          // Rotate indices clockwise when cycle completes
          setCurrentIndices((indices) => [
            (indices[0] + 1) % 3, // Top -> Bottom Right
            (indices[1] + 1) % 3, // Bottom Right -> Bottom Left
            (indices[2] + 1) % 3, // Bottom Left -> Top
          ]);
          return 0;
        }
        return prev + 0.02; // Faster: ~0.5-second cycle (0.02 * 25 = 0.5)
      });
    }, 10); // ~100fps for smooth animation

    return () => clearInterval(interval);
  }, []);

  // Function to get current and target positions
  const getCurrentPosition = (index: number) => positions[currentIndices[index]];
  const getTargetPosition = (index: number) => positions[(currentIndices[index] + 1) % 3];

  // Calculate positions for all dots (to use for both circles and wireframe)
  const dotPositions = Array.from({ length: 3 }).map((_, index) => {
    const currentPos = getCurrentPosition(index);
    const targetPos = getTargetPosition(index);

    // Calculate initial and final angles relative to center
    const startAngle = Math.atan2(currentPos.y - center.y, currentPos.x - center.x);
    const endAngle = Math.atan2(targetPos.y - center.y, targetPos.x - center.x);
    const adjustedEndAngle = endAngle < startAngle ? endAngle + 2 * Math.PI : endAngle;
    const angleChange = adjustedEndAngle - startAngle;

    // Current angle and radius
    const t = progress;
    const currentAngle = startAngle + angleChange * t;
    const maxRadius = Math.sqrt(
      (currentPos.x - center.x) ** 2 + (currentPos.y - center.y) ** 2
    );
    const radius = maxRadius * (1 - 2 * Math.abs(t - 0.5));

    return {
      x: center.x + radius * Math.cos(currentAngle),
      y: center.y + radius * Math.sin(currentAngle),
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        {/* Wireframe triangle */}
        <Path
          d={`M ${dotPositions[0].x} ${dotPositions[0].y} L ${dotPositions[1].x} ${dotPositions[1].y} L ${dotPositions[2].x} ${dotPositions[2].y} Z`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="1"
        />

        {/* Dots */}
        {dotPositions.map((pos, index) => {
          const scale = 1 + Math.sin(progress * Math.PI); // Peaks at center
          return (
            <Circle
              key={index}
              cx={pos.x}
              cy={pos.y}
              r={3 * scale} // Base radius 3, scales to 6 at center
              fill={color}
            />
          );
        })}
      </Svg>
    </View>
  );
};

export default TriangularSpinner;

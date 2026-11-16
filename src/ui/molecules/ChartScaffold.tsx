export interface ChartScaffoldProps {
  width: number;
  height: number;
  gradientId: string;
  color?: string;
}

/**
 * The gradient and horizontal guide lines shared by the history and solar
 * charts. Rendered inside an `<svg>`; the chart keeps ownership of its area
 * fill and series paths.
 */
export const ChartScaffold = ({
  width,
  height,
  gradientId,
  color = "var(--accent)",
}: ChartScaffoldProps) => {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".26" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((part) => (
        <line
          key={part}
          x1="0"
          y1={height * part}
          x2={width}
          y2={height * part}
          stroke="var(--line)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </>
  );
};

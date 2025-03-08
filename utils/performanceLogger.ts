type PerformanceEntry = {
  start: number;
  end?: number;
  duration?: number;
};

type MetricsSummary = {
  operation: string;
  calls: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
};

class PerformanceLogger {
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private activeOperations: Map<string, number> = new Map();

  startOperation(operation: string) {
    const start = performance.now();
    this.activeOperations.set(operation, start);
    return start;
  }

  endOperation(operation: string) {
    const start = this.activeOperations.get(operation);
    if (!start) {
      console.warn(`No start time found for operation: ${operation}`);
      return;
    }

    const end = performance.now();
    const duration = end - start;

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)?.push({
      start,
      end,
      duration
    });

    this.activeOperations.delete(operation);
    return duration;
  }

  getMetrics(operation?: string): MetricsSummary | MetricsSummary[] | null {
    if (operation) {
      const metrics = this.metrics.get(operation);
      if (!metrics) return null;

      const totalDuration = metrics.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const avgDuration = totalDuration / metrics.length;
      const minDuration = Math.min(...metrics.map(m => m.duration || 0));
      const maxDuration = Math.max(...metrics.map(m => m.duration || 0));

      return {
        operation,
        calls: metrics.length,
        totalDuration,
        avgDuration,
        minDuration,
        maxDuration
      };
    }

    // Return all metrics
    return Array.from(this.metrics.keys()).map(op => this.getMetrics(op) as MetricsSummary);
  }

  reset() {
    this.metrics.clear();
    this.activeOperations.clear();
  }
}

export const performanceLogger = new PerformanceLogger();
const executionCounts = new Map<string, number>();

/** DEV-only query execution counter for tracing accidental client refetches. */
export function logQueryExecution(queryName: string, source: string): void {
  if (!import.meta.env.DEV) return;
  const executions = (executionCounts.get(queryName) ?? 0) + 1;
  executionCounts.set(queryName, executions);
  console.info("[query.execution]", { queryName, executions, source });
}
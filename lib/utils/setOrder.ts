/**
 * sets already filters out soft-deleted rows, so sets.length undercounts
 * once a mid-session set is deleted (e.g. sets 0,1,2 logged, 1 deleted ->
 * sets.length is 2, but set_order 2 is still taken -> a naive "length as
 * next order" would collide with it). max+1 always lands on an unused
 * set_order regardless of gaps from deletions.
 */
export function nextSetOrder(sets: { set_order: number }[]): number {
  return sets.length > 0 ? Math.max(...sets.map((s) => s.set_order)) + 1 : 0;
}

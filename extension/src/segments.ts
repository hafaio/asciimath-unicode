/** a run of text from one node, placed at `start` in the combined text */
export interface Segment<NodeType> {
    /** the node the text comes from */
    node: NodeType;
    /** index of the run's first character in the combined text */
    start: number;
    /** number of characters in the run */
    length: number;
}

/**
 * find the node and offset for an index into the combined text
 *
 * At a boundary between two nodes, a `bias` of "start" picks the later node
 * and "end" the earlier one, so a range built from them stays inside the text
 * it covers.
 */
export function locate<NodeType>(
    segments: readonly Segment<NodeType>[],
    index: number,
    bias: "start" | "end",
): { node: NodeType; offset: number } | undefined {
    const found =
        bias === "start"
            ? (segments.find(
                  ({ start, length }) =>
                      start <= index && index < start + length,
              ) ??
              segments.find(({ start, length }) => start + length === index))
            : (segments.find(
                  ({ start, length }) =>
                      start < index && index <= start + length,
              ) ?? segments.find(({ start }) => start === index));
    if (found === undefined) {
        return undefined;
    } else {
        return { node: found.node, offset: index - found.start };
    }
}

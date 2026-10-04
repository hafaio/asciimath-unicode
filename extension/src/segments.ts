/** a run of text from one node, placed at `start` in the combined text */
export interface Segment<NodeType> {
	node: NodeType;
	start: number;
	length: number;
}

/**
 * The node and offset for an index into the combined text. At a boundary
 * between two nodes, "start" picks the later node and "end" the earlier one,
 * so a range built from them stays inside the text it covers.
 */
export function locate<NodeType>(
	segments: readonly Segment<NodeType>[],
	index: number,
	bias: "start" | "end",
): { node: NodeType; offset: number } | undefined {
	const found =
		bias === "start"
			? (segments.find(
					({ start, length }) => start <= index && index < start + length,
				) ?? segments.find(({ start, length }) => start + length === index))
			: (segments.find(
					({ start, length }) => start < index && index <= start + length,
				) ?? segments.find(({ start }) => start === index));
	if (found === undefined) {
		return undefined;
	} else {
		return { node: found.node, offset: index - found.start };
	}
}

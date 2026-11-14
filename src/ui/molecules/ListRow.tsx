import { EntityRow, type EntityRowProps } from "./EntityRow";

export type ListRowProps = EntityRowProps;

/**
 * A named alias for `EntityRow` so layer code reads as a list of rows. It
 * stays a thin pass-through rather than a second row implementation.
 */
export function ListRow(props: ListRowProps) {
  return <EntityRow {...props} />;
}

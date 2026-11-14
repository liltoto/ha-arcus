import { icon } from "../../render/icons";

export interface IconProps {
  name: string;
  className?: string;
  title?: string;
}

/**
 * Renders one of Arcus's static inline SVG icons. `icon()` resolves the name
 * against the internal map, so the injected markup never contains user input.
 */
export function Icon({ name, className, title }: IconProps) {
  return (
    <span
      style={{ display: "contents" }}
      aria-hidden={title ? undefined : true}
      title={title}
      dangerouslySetInnerHTML={{ __html: icon(name, className) }}
    />
  );
}

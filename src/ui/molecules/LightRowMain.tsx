import { c } from "../styles/classes";

export interface LightRowMainProps {
  name: string;
  sub: string;
  value: string;
}

/** The shared name/sub/value block used by both light-row widgets. */
export const LightRowMain = ({ name, sub, value }: LightRowMainProps) => {
  return (
    <>
      <span className={c("row-main")}>
        <span className={c("row-name")}>{name}</span>
        <span className={c("row-sub")}>{sub}</span>
      </span>
      <span className={c("row-val")}>{value}</span>
    </>
  );
};

import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { c } from "../styles/classes";

export interface MediaRowProps {
  name: string;
  state: string;
  isPlaying: boolean;
  onToggle: () => void;
}

/** A speaker/media row with the play/pause round button. */
export function MediaRow({ name, state, isPlaying, onToggle }: MediaRowProps) {
  return (
    <div className={c("row")}>
      <Icon name="play" />
      <div className={c("row-main")}>
        <div className={c("row-name")}>{name}</div>
        <div className={c("row-sub")}>{state}</div>
      </div>
      <IconButton
        icon={isPlaying ? "pause" : "play"}
        label={`${isPlaying ? "Pause" : "Play"} ${name}`}
        dataAct="media-toggle"
        onClick={onToggle}
      />
    </div>
  );
}

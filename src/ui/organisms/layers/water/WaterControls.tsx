import type { Translator } from "../../../../types";
import { ToggleRow } from "../../../molecules/ToggleRow";

interface WaterControlsProps {
  entityId: string;
  isOn: boolean;
  onChange: () => void;
  t: Translator;
}

/** Holiday mode is the water sheet's only control. */
export const WaterControls = ({
  entityId,
  isOn,
  onChange,
  t,
}: WaterControlsProps) => {
  return (
    <ToggleRow
      label={t("water.holiday")}
      sub={t("water.holidaySub")}
      isOn={isOn}
      onChange={onChange}
      dataAct="toggle-bool"
      dataEntity={entityId}
    />
  );
};

import { FONT_FACE_CSS } from "../../render/fonts";
import panda from "./panda.css?inline";

/** The card injects this whole string into its shadow root. */
export const STYLES = `${FONT_FACE_CSS}${panda}`;

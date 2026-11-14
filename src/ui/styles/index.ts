import { FONT_FACE_CSS } from "../../render/fonts";
import atoms from "./atoms.css?inline";
import home from "./home.css?inline";
import responsive from "./responsive.css?inline";
import sheet from "./sheet.css?inline";
import tokens from "./tokens.css?inline";

export const STYLES = [FONT_FACE_CSS, tokens, home, sheet, atoms, responsive].join("");

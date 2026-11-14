/**
 * Public hook surface for Arcus React components.
 *
 * The implementations live beside the contexts in
 * `providers/ArcusProvider.tsx` so the context objects can stay private.
 * This module keeps page imports short and stable.
 */
export {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useHistory,
  useModel,
  useNow,
  useRoute,
  useTranslator,
} from "./providers/ArcusProvider";

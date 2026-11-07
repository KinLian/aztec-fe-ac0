import { copyText, downloadText } from '../lib/files.js';
import { exportPreset, recipeText, slugify } from '../lib/presetModel.js';
import { toXmp, xmpFileName } from '../lib/xmp.js';

/** Copy recipe / download XMP / download JSON for a preset. */
export default function Actions({ preset, notify, size = '' }) {
  const cls = `btn ${size}`.trim();
  return (
    <>
      <button
        type="button"
        className={cls}
        onClick={async () => notify((await copyText(recipeText(preset))) ? 'Recipe copied. Paste it into your notes.' : 'Could not copy. Select the text manually.')}
      >
        Copy recipe
      </button>
      <button
        type="button"
        className={cls}
        onClick={() => {
          downloadText(xmpFileName(preset), toXmp(preset), 'application/xml');
          notify('Downloaded the .xmp preset. In Lightroom, import it from the Presets panel.');
        }}
      >
        Download .xmp
      </button>
      <button
        type="button"
        className={cls}
        onClick={() => {
          downloadText(`${slugify(preset.name)}.json`, JSON.stringify(exportPreset(preset), null, 2));
          notify('Downloaded the preset JSON.');
        }}
      >
        Download JSON
      </button>
    </>
  );
}

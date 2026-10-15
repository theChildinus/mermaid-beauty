"""Build the public 15-second demo from the browser-generated comparison frames.

Requires Pillow. Run after Export README comparisons, using the same preview dir.
"""
import os
from pathlib import Path
from PIL import Image

preview = Path(os.environ.get('MERMAID_BEAUTY_PREVIEW_DIR', '.preview'))
frames = []
for name in ('flowchart', 'chinese', 'dark'):
    for phase in ('before', 'after'):
        with Image.open(preview / f'{name}-{phase}.png') as image:
            frames.append(image.convert('RGB').quantize(colors=128))
frames[0].save('docs/images/demo.gif', save_all=True, append_images=frames[1:],
               duration=2500, loop=0, optimize=True, disposal=2)
print('Saved docs/images/demo.gif (6 frames, 15 seconds).')

#!/usr/bin/env bash
# Downloads the planet textures (three.js examples, MIT) and builds the coastal flood mask.
set -e
cd "$(dirname "$0")"
mkdir -p tex
B=https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures
for f in planets/earth_day_4096.jpg planets/earth_night_4096.jpg planets/earth_bump_roughness_clouds_4096.jpg planets/moon_1024.jpg lava/lavatile.jpg; do
  curl -sSf -o "tex/$(basename $f)" "$B/$f"
done
python3 - <<'PY'
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
im=Image.open('tex/earth_bump_roughness_clouds_4096.jpg').resize((2048,1024),Image.LANCZOS)
r,g,b=im.split()
land=np.array(g)/255.0>=0.5; h=np.array(r)/255.0
lab,n=ndimage.label(~land)
sizes=ndimage.sum(~land,lab,range(1,n+1))
ocean=np.isin(lab,1+np.where(sizes>20000)[0])
dist=ndimage.distance_transform_edt(~ocean)
f=((dist>0)&(dist<5)&(h<0.09)).astype(np.float32)
Image.fromarray((f*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)).save('tex/floodmap.png')
PY

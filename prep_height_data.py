x0 = 2688501
y0 = 1251501
width = 1500
height = 2500

step = 2

gwidth = width // step
gheight = height // step

grid = [[None] * gwidth for _ in range(gheight)]

import glob
import json


for fname in glob.glob('/home/leonh/Downloads/alti/*.xyz'):
    with open(fname) as f:
        it = iter(f)
        next(it)
        x1 = x2 = y1 = y2 = None
        for line in it:
            x,y,z = map(float, line.split())
            if x0 <= x < x0+width and y0 <= y < y0+height:
                i = int(x-x0) // step
                j = int(y-y0) // step
                grid[j][i] = z
                if x1 is None:
                    x1 = x2 = x
                    y1 = y2 = y
                x1 = min(x, x1)
                y1 = min(y, y1)
                x2 = max(x, x2)
                y2 = max(y, y2)
    print(fname, (x1,x2), (y1,y2))

assert all(isinstance(z, float) for row in grid for z in row)

with open('/home/leonh/Downloads/alti/heights.json', 'w') as f:
    json.dump({'x0': x0, 'y0': y0, 'step': step, 'grid': grid}, f)
    
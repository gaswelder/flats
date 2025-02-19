#!/bin/sh
cd frontend
v=`date +%Y%m%d%H%M`
cat index.html | sed "s/index.js/index$v.js/" > dist/index.html
../node_modules/.bin/esbuild --bundle --minify --loader:.js=jsx --target=firefox57 --outfile=dist/index$v.js index.js


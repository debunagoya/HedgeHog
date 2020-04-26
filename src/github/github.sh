#!/bin/bash

curl https://github.com/$1 | awk '/<svg.+class="js-calendar-graph-svg"/,/svg>/' | sed -e 's/<svg/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/' > github/grass.svg

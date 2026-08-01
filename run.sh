#!/bin/bash
cd "$(dirname "$0")"
npm run build && ./node_modules/.bin/electron .

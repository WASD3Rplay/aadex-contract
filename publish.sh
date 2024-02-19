#!/usr/bin/env bash

set -e

npm run build
npm pack --dry-run
npm publish --access public

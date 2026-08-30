#!/bin/bash
if npm run build; then
  echo "BUILD SUCCESS"
else
  echo "BUILD FAILED"
fi

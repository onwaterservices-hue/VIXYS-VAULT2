import re

with open('src/data/assetData.ts', 'r') as f:
    code = f.read()

# We can replace the static whales array with a function call, but it's exported as a const ASSET_DATABASE.
# We can just change the timeAgo strings in assetData.ts to 'Just now' or something, or better yet, make them slightly more dynamic in the UI.


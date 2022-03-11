#!/bin/bash

script_dir=$(dirname "$0")
node --require "$script_dir/trace-to-har.js" "$script_dir/client.js"

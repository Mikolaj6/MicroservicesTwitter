#!/bin/bash

for elem in ./public/js/*.ts; do
    base=$( basename ${elem} )
    tsc --downlevelIteration --lib DOM,es2018 ./public/js/${base}
done

tsc --downlevelIteration --lib es2018 server.ts

node server
#!/bin/bash

tsc --downlevelIteration --lib es2018 createDb.ts
node createDb

require('dotenv')
require('@babel/register')()
require('babel-polyfill')
require('../src/lib/Workers/workerJobs.js')

#!/bin/bash
# Runs on LocalStack startup — creates the local S3 bucket
awslocal s3 mb s3://ryde-local
echo "LocalStack: bucket ryde-local created"

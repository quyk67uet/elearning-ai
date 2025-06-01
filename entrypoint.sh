#!/bin/bash
echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
bench serve --port $PORT
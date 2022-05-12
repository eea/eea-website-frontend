#!/bin/sh
env \
  UV_THREADPOOL_SIZE=10 \
  DEBUG=esmiddleware \
  RAZZLE_PROXY_QA_DSN=http://localhost:8000/api \
  RAZZLE_PROXY_ES_DSN_datahub=http://10.120.10.204:60168/data_searchui_datahub yarn start
  RAZZLE_PROXY_ES_DSN_globalsearch=http://10.120.10.131:57664/data_searchui_datahub yarn start

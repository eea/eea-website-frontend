#!/bin/sh
ES_URL="http://search:60168"
QA_URL="http://search:60022"
BASE_URL="http://backend:54975"
env \
  DEBUG=esmiddleware \
  RAZZLE_PROXY_ES_DSN_datahub=$ES_URL/data_searchui_datahub \
  RAZZLE_PROXY_QA_DSN_datahub=$QA_URL/api \
  RAZZLE_PROXY_ES_DSN_globalsearch=$ES_URL/data_searchui \
  RAZZLE_PROXY_QA_DSN_globalsearch=$QA_URL/api \
  RAZZLE_API_PATH=$BASE_URL/www \
  RAZZLE_INTERNAL_API_PATH=$BASE_URL/www \
  yarn start

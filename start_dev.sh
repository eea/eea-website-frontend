#!/bin/sh

SEARCH=10.120.10.204
QA=10.120.10.204

ES_URL="http://$SEARCH:60168"
QA_URL="http://$QA:60022"

env \
  DEBUG=esmiddleware \
  RAZZLE_PROXY_ES_DSN_datahub=$ES_URL/data_searchui_datahub \
  RAZZLE_PROXY_ES_DSN_globalsearch=$ES_URL/data_searchui \
  RAZZLE_PROXY_QA_DSN_datahub=$QA_URL/api \
  RAZZLE_PROXY_QA_DSN_globalsearch=$QA_URL/api \
  yarn start


# RAZZLE_API_PATH=http://10.110.30.173:50045/www RAZZLE_INTERNAL_API_PATH=http://10.110.30.173:50045/www yarn start

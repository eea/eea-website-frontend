FROM node:18-bullseye-slim

COPY . /app/
WORKDIR /app/

# Update apt packages
RUN runDeps="openssl ca-certificates patch gosu git make tmux locales-all" \
 && apt-get update \
 && apt-get install -y --no-install-recommends $runDeps \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g mrs-developer \
 && cp jsconfig.json.prod jsconfig.json \
 && mkdir -p /app/src/addons \
 && rm -rf /app/src/addons/* \
 && find /app/ -not -user node -exec chown node {} \+ \
 && corepack enable

USER node

ARG MAX_OLD_SPACE_SIZE=8192
ENV NODE_OPTIONS=--max_old_space_size=$MAX_OLD_SPACE_SIZE

RUN make develop
RUN yarn
RUN yarn build
RUN rm -rf /home/node/.cache
RUN rm -rf /home/node/.yarn
RUN rm -rf /home/node/.npm
RUN rm -rf /app/.yarn/cache
USER root

EXPOSE 3000 3001

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["yarn", "start:prod"]

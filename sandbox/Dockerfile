FROM node:20-alpine

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

WORKDIR /workspace

COPY sandbox/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER sandbox

ENTRYPOINT ["/entrypoint.sh"]

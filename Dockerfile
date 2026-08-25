# syntax=docker/dockerfile:1

# Both stages track .nvmrc, not the `engines` floor in package.json. The floor is
# what this code still runs on; .nvmrc is the version CI lints, covers and runs the
# browser suite against, so it is the one production should match. They drift:
# scripts/check-node-versions.sh fails the build when these lines and .nvmrc disagree.

# ---- build ----
FROM node:26-alpine AS build
WORKDIR /app

# Manifests first: the dependency layer then survives source-only changes.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY tsconfig.base.json tsconfig.json tsconfig.build.json ./
COPY packages packages
COPY apps apps

# Belt and braces alongside .dockerignore: any incremental build state that
# reaches the context would make `tsc --build` skip projects as already built,
# leaving their dist/ missing. The image must not depend on a clean working tree.
RUN find . -name '*.tsbuildinfo' -not -path './node_modules/*' -delete \
 && rm -rf packages/*/dist apps/*/dist \
 && npm run build

# Drop dev dependencies so only what runs gets copied forward.
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:26-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5050

# node:alpine already ships an unprivileged `node` user; use it rather than
# inventing another.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/engine/dist ./packages/engine/dist
COPY --from=build --chown=node:node /app/packages/engine/package.json ./packages/engine/
COPY --from=build --chown=node:node /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build --chown=node:node /app/packages/protocol/package.json ./packages/protocol/
COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/server/package.json ./apps/server/
# apps/server/src/http.ts resolves the client relative to its own dist, at
# ../../web/dist. Keep this layout or the server serves the API and no page.
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/apps/web/package.json ./apps/web/
COPY --from=build --chown=node:node /app/package.json ./

USER node
EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5050)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/index.js"]

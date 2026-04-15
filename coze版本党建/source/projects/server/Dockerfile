FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json build.js tsconfig.json ./

RUN pnpm install

COPY src ./src

RUN pnpm run build && pnpm prune --prod

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["pnpm", "run", "start"]

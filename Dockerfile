FROM public.ecr.aws/docker/library/node

WORKDIR /home/app

COPY package.json yarn.lock ./
RUN yarn

COPY frontend frontend
RUN yarn build-fe

COPY backend backend

USER node
CMD ["node", "backend/index.mjs"]

FROM public.ecr.aws/docker/library/node

WORKDIR /home/app

COPY frontend/package.json frontend/yarn.lock frontend/
COPY backend/package.json backend/yarn.lock backend/

RUN cd frontend && yarn && cd ..
RUN cd backend && yarn && cd ..

COPY frontend frontend
RUN cd frontend && yarn build && cd ..

COPY backend backend

USER node
CMD ["node", "backend/index.mjs"]

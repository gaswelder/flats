FROM node

WORKDIR /home/app
COPY backend/ backend/
COPY frontend/ frontend/
RUN cd backend; yarn; cd ..
RUN cd frontend; yarn; yarn build; cd ..

CMD ["node", "./backend"]

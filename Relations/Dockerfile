# start from base
FROM node:7

ADD ServiceRelations /opt/relations
WORKDIR /opt/relations

# fetch app specific deps
RUN npm install

RUN npm install -g typescript

# start app
CMD [ "bash", "./compileAndRun.sh" ]

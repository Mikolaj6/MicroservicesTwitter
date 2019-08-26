# start from base
FROM node:7

ADD ServiceSetup /opt/setup
WORKDIR /opt/setup

# fetch app specific deps
RUN npm install
RUN npm install -g typescript

# start app
CMD [ "bash", "compileAndRun.sh" ]

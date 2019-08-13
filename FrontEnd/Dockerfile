# start from base
FROM node:7

# copy our application code
ADD ServiceFrontEnd /opt/servicefront
WORKDIR /opt/servicefront

# fetch app specific deps
RUN npm install

RUN npm install -g typescript

# start app
CMD [ "bash", "./compileAndRun.sh" ]

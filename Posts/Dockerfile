# start from base
FROM node:7

ADD ServicePosts /opt/posts
WORKDIR /opt/posts

# fetch app specific deps
RUN npm install

RUN npm install -g typescript

# start app
CMD [ "bash", "./compileAndRun.sh" ]

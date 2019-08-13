# start from base
FROM node:7

# install system-wide deps for python and node
# RUN apt-get -yqq update
# RUN apt-get install -yq wget
# RUN wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
# RUN export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
# RUN nvm install v10.15.1
# RUN nvm use v10.15.1

# copy our application code
ADD ServiceUsers /opt/users
WORKDIR /opt/users

# fetch app specific deps
RUN npm install

RUN npm install -g typescript

# start app
CMD [ "bash", "./compileAndRun.sh" ]

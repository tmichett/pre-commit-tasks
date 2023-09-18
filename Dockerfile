FROM public.ecr.aws/docker/library/node:slim AS node_base 

COPY . /code
WORKDIR /code

RUN echo "NODE_ENV=development" >> /etc/environment

ENV DISPLAY=:1

RUN apt-get update
RUN apt-get install -y \
  bzr \
  cvs \
  mercurial \
  subversion \
  libgtkextra-dev \
  libgconf2-dev \
  libnss3 \
  libasound2 \
  libxtst-dev \
  libxss1 \
  libgbm-dev \
  xvfb \
  x11vnc \
  fluxbox \
  && rm -rf /var/lib/apt/lists/*

RUN npm install

ENTRYPOINT ["bash", "docker-entrypoint.sh"]

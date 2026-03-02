FROM node:22.18.0-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies (also remove node_modules to prevent leaking host deps when using with compose)
COPY yarn.lock ./
COPY package.json ./

RUN yarn --production --frozen-lockfile install

# Bundle app source
COPY . ./

# Transpile
RUN npm run build

# Copy templates to root (Babel doesn't copy non-JS files)
RUN cp -r src/templates ./templates

ENV NODE_ENV=production

# Start server
CMD [ "npm", "start" ]


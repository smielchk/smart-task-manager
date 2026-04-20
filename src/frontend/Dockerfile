# Smart Task Manager — Frontend Multi-Stage Docker Image
# React 18 + Vite build → Nginx serve

# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY --from=builder /app/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

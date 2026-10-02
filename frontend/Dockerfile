FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback: mọi route không phải file → index.html (React Router)
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location /api/ {\n    proxy_pass http://backend:3000;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

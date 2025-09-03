# Use nginx to serve static files
FROM nginx:alpine

# Copy static files directly (HTML, CSS, JS)
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY favicon.svg /usr/share/nginx/html/

# Copy custom nginx config for serving static files
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '  listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '  server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '  root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '    try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '  # Allow CORS for API calls' >> /etc/nginx/conf.d/default.conf && \
    echo '  location /api/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Access-Control-Allow-Origin *;' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Access-Control-Allow-Headers "Content-Type, Authorization";' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
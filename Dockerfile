# MantaSphere Docker Image
# Assumes dist/bundle.js is already built (via npm run build)
# For local: npm run build && docker-compose up --build
# For CI: GitHub Actions builds first, then this Dockerfile runs

FROM nginx:alpine

# Copy pre-built bundle and static assets
COPY dist /usr/share/nginx/html/dist
COPY index.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]

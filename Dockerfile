FROM mcr.microsoft.com/playwright:v1.54.2-jammy

# Set workdir
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Ensure browsers are installed
RUN npx playwright install --with-deps chromium

# Expose port
EXPOSE 10000

CMD ["node", "app.js"]

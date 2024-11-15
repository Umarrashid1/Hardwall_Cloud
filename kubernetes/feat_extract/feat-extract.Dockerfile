# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the Python requirements file into the container
COPY feature_extraction-requirements.txt ./

# Install any needed packages specified in the Python requirements file
RUN pip install --no-cache-dir -r feature_extraction-requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Install Node.js dependencies
RUN npm install

# Make port 80 available to the world outside this container
EXPOSE 80

# Define environment variable
ENV NAME World

# Run featextract-app.js when the container launches
CMD ["node", "featextract-app.js"]
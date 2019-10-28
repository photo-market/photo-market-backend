#!/bin/bash

echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

# Push latest tag
docker push ${IMAGE_NAME}

# Push specific tag
NEW_IMAGE_NAME=${IMAGE_NAME}:${TRAVIS_BUILD_NUMBER}
docker tag ${IMAGE_NAME} ${NEW_IMAGE_NAME}
docker push ${NEW_IMAGE_NAME}

# Run
# docker run --rm -p 9000:80 saniaky/photo-market-api:latest
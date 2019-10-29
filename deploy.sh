#!/bin/bash

echo "Loggin in to dockerhub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_ACCOUNT" --password-stdin

# Push latest tag
echo "Pushing image with the lastest tag..."
docker push ${IMAGE_NAME}

# Push specific tag
echo "Pushing specific image tag..."
NEW_IMAGE_NAME=${IMAGE_NAME}:${TRAVIS_BUILD_NUMBER}
docker tag ${IMAGE_NAME} ${NEW_IMAGE_NAME}
docker push ${NEW_IMAGE_NAME}
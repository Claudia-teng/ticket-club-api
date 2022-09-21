#!/bin/bash
docker-compose down
docker rmi claudiateng/ticket-club-web
docker pull claudiateng/ticket-club-web:latest
docker pull claudiateng/ticket-club-nginx:latest
cd /home/ec2-user/ticket-club-api/docker
docker-compose up -d
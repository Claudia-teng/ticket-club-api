#!/bin/bash
docker stop ticket-club-web
docker rm ticket-club-web
docker rmi claudiateng/ticket-club-web
docker pull claudiateng/ticket-club-web:latest
cd /home/ec2-user/ticket-club-api
docker run -d -p 3000:3000 --ulimit nofile=1048576:1048576 --env-file .env --name ticket-club-web claudiateng/ticket-club-web
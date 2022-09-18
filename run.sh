#!/bin/bash
cd /home/ec2-user/ticket-club-api
docker pull claudiateng/ticket-club-web:latest
docker pull claudiateng/ticket-club-nginx:latest
cd /home/ec2-user/ticket-club-api/docker
docker-compose up -d
#!/bin/bash
cd /home/ec2-user/ticket-club-api
docker pull claudiateng/ticket-club-web:latest
docker pull claudiateng/ticket-club-nginx:latest
docker-compose up -d